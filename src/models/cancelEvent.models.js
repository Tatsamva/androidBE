import mongoose from "mongoose";

const cancelEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event", // reference original Event
      required: true,
    },
    progress: {
      type: String,
      enum: ["underprocess", "cancel"], // status of cancellation
      default: "underprocess",
    },
    reason: {
      type: String,
      required: false, // optional (user may or may not provide reason)
      trim: true, // clean up spaces
    },
  },
  {
    timestamps: true, // keeps createdAt & updatedAt
  }
);

export const CancelEvent = mongoose.model("CancelEvent", cancelEventSchema);
