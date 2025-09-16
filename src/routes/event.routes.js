import { Router } from "express";
import { registerNewEvent,getAllEventsByCategory,getAllEventsOfUser,updateEventDetails,getEventCounts,deleteEventBy,getOneEventById,cancelEvent,approveCancelEvent} from "../controllers/event.controllers.js";
const router = Router();




router.route("/register").post(registerNewEvent);
router.route("/getalleventsbycategory").post(getAllEventsByCategory);
router.route("/getalleventsofuser").post(getAllEventsOfUser);
router.route("/updateeventdetails").post(updateEventDetails);
router.route("/deleteevent").post(deleteEventBy);
router.route("/geteventcount").get(getEventCounts)
router.route("/getoneeventbyid").post(getOneEventById)
router.route("/cancelevent").post(cancelEvent)
router.route("/approvecancelevent").post(approveCancelEvent)

export default router