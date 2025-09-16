import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { CancelEvent } from "../models/cancelEvent.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { Event } from "../models/event.models.js";
import { GoogleGenerativeAI } from '@google/generative-ai';
import mime from 'mime';
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config();


const registerNewEvent = asyncHandler(async (req, res) => {
    const {
        address,
        userId,
        eventType,
        eventDate,
        eventTime,
        numOFMembers,
        venue,
        totalPrice
    } = req.body;

    // ✅ Validate required fields
    if (
        !userId ||
        !eventType ||
        !eventDate ||
        !eventTime ||
        !numOFMembers ||
        !venue ||
        !totalPrice
    ) {
        throw new ApiError(409, "One or more required fields are empty");
    }

    // ✅ Check if user exists
    const existUser = await User.findById(userId);
    if (!existUser) {
        throw new ApiError(404, "User does not exist");
    }

    // ✅ Update user address if provided
    if (address) {
        existUser.address = address;
        await existUser.save();
    }

    // ✅ Check for event conflict (same venue + date + time)
    const existingEvent = await Event.findOne({
        venue,
        eventDate,
        eventTime, // dropdown ensures exact string match
    });

    if (existingEvent) {
        throw new ApiError(409, "This time slot is already booked at this venue");
    }

    // ✅ Create new event
    const newEvent = await Event.create({
        user: userId,
        eventType,
        eventDate,
        eventTime,
        numOFMembers,
        venue,
        totalPrice,
    });

    return res.status(201).json(
        new ApiResponse(200, newEvent, "New event registered successfully")
    );
});

//Admin
const getOneEventById = asyncHandler(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        throw new ApiError(400, "Event ID is required");
    }

    // Find event by ID + populate user details
    const event = await Event.findById(id)
        .populate("user", "name email phone address")
        .select("-createdAt -updatedAt -__v"); // remove unwanted fields

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // Flatten user fields
    const { user, ...eventObj } = event.toObject();
    const formattedEvent = {
        ...eventObj,
        user: user?._id, // keep user id
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        address: user?.address
    };

    return res.status(200).json(
        new ApiResponse(200, formattedEvent, "Event fetched successfully")
    );
});

const getAllEventsByCategory = asyncHandler(async (req, res) => {
    const { eventType } = req.body;

    if (!eventType) {
        throw new ApiError(400, "Event type is required");
    }

    let query = {};
    if (eventType !== "All Events") {
        query.eventType = eventType;
    }

    // Get events with populated user
    const events = await Event.find(query)
        .populate("user", "name email phone address");

    if (!events || events.length === 0) {
        throw new ApiError(404, "No events found for this category");
    }

    // Flatten user fields
    const formattedEvents = events.map(event => {
        const { user, ...eventObj } = event.toObject();
        return {
            ...eventObj,
            user: user?._id, // keep user id
            name: user?.name,
            email: user?.email,
            phone: user?.phone,
            address: user?.address
        };
    });

    return res.status(200).json(
        new ApiResponse(200, formattedEvents, "Events fetched successfully")
    );
});




const getEventCounts = asyncHandler(async (req, res) => {
    // Fetch all events
    const allEvents = await Event.find();

    if (!allEvents) {
        throw new ApiError(404, "No events found");
    }

    // Total events
    const totalEvents = allEvents.length;

    // Count by category
    const countsByCategory = {};

    allEvents.forEach(event => {
        const category = event.eventType || "Uncategorized";
        countsByCategory[category] = (countsByCategory[category] || 0) + 1;
    });

    // Add totalEvents to countsByCategory
    countsByCategory["All Events"] = totalEvents;

    // Send response
    return res.status(200).json(
        new ApiResponse(200, {countsByCategory}, "Event counts fetched successfully")
    );
});
//admin
const deleteEventBy = asyncHandler(async (req, res) => {
    const { id } = req.body;

    
    if (!id) {
        throw new ApiError(400, "Event ID is required");
    }

    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
        throw new ApiError(404, "Event not found");
    }

    
    return res.status(200).json(
        new ApiResponse(200, null, "Event deleted successfully")
    );
});


//user
const getAllEventsOfUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Validate required fields
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    // Check if user exists
    const existUser = await User.findById(userId);
    if (!existUser) {
        throw new ApiError(404, "User does not exist");
    }

    // Fetch all events by user
    const userEvents = await Event.find({ user: userId });

    if (!userEvents || userEvents.length === 0) {
        throw new ApiError(404, "No events found for this user");
    }

    return res.status(200).json(
        new ApiResponse(200, userEvents, "User events fetched successfully")
    );
});

const updateEventDetails = asyncHandler(async (req, res) => {
    const { 
        id,              // event id
        userId, 
        name, 
        email, 
        phone, 
        address,
        eventType, 
        eventDate, 
        eventTime, 
        numOFMembers, 
        venue, 
        totalPrice 
    } = req.body;

    // ✅ Validate required fields
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }
    if (!id) {
        throw new ApiError(400, "Event ID is required");
    }

    // ✅ Check if user exists
    let existUser = await User.findById(userId).select("-password -refreshToken");
    if (!existUser) {
        throw new ApiError(404, "User does not exist");
    }

    // ✅ Update user details
    if (name) existUser.name = name;
    if (email) existUser.email = email;
    if (phone) existUser.phone = phone;
    if (address) existUser.address = address;
    await existUser.save();

    // Re-fetch user to apply select after save
    existUser = await User.findById(userId).select("-password -refreshToken");

    // ✅ Check if event exists
    const existEvent = await Event.findById(id);
    if (!existEvent) {
        throw new ApiError(404, "Event does not exist");
    }

    // ✅ Update event details
    if (eventType) existEvent.eventType = eventType;
    if (eventDate) existEvent.eventDate = eventDate;
    if (eventTime) existEvent.eventTime = eventTime;
    if (numOFMembers) existEvent.numOFMembers = numOFMembers;
    if (venue) existEvent.venue = venue;
    if (totalPrice) existEvent.totalPrice = totalPrice;
    await existEvent.save();

    return res.status(200).json(
        new ApiResponse(200, { user: existUser, event: existEvent }, "User & Event updated successfully")
    );
});


const cancelEvent = asyncHandler(async (req, res) => {
  const { eventId, reason } = req.body;

  // Validate required field
  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  // Check if event exists
  const existEvent = await Event.findById(eventId);
  if (!existEvent) {
    throw new ApiError(404, "Event does not exist");
  }

  // Create cancel request
  const cancelReq = await CancelEvent.create({
    eventId,
    reason: reason || null, // optional
    progress: "underprocess",
  });

  return res.status(201).json(
    new ApiResponse(201, cancelReq, "Cancel request created successfully")
  );
});


// Admin: Approve and finalize event cancellation
const approveCancelEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.body;

  // Validate required field
  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  // Check if cancel request exists
  const cancelReq = await CancelEvent.findOne({ eventId });
  if (!cancelReq) {
    throw new ApiError(404, "Cancel request not found for this event");
  }

  // Check if event exists
  const existEvent = await Event.findById(eventId);
  if (!existEvent) {
    throw new ApiError(404, "Event does not exist");
  }

  // Delete the event
  await Event.findByIdAndDelete(eventId);

  // Delete cancel request as well
  await CancelEvent.findOneAndDelete({ eventId });

  return res.status(200).json(
    new ApiResponse(200, null, "Event and cancel request deleted successfully")
  );
});

// Get all cancel events
const getAllCancelEvents = asyncHandler(async (req, res) => {
  const cancelEvents = await CancelEvent.find()
    .populate("eventId", "name date location") // optional: populate event details
    .sort({ createdAt: -1 }); // latest first

  if (!cancelEvents || cancelEvents.length === 0) {
    throw new ApiError(404, "No cancel events found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Cancel events fetched successfully"));
});

export{
    registerNewEvent,
    getAllEventsByCategory,
    getAllEventsOfUser,
    updateEventDetails,
    getEventCounts,
    deleteEventBy,
    getOneEventById,
    cancelEvent,
    approveCancelEvent,
    getAllCancelEvents
}