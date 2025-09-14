import { Router } from "express";
import { registerNewEvent,getAllEventsByCategory,getAllEventsOfUser,updateEventDetails,getEventCounts} from "../controllers/event.controllers.js";
const router = Router();

router.route("/register").post(registerNewEvent);
router.route("/getalleventsbycategory").post(getAllEventsByCategory);
router.route("/getalleventsofuser").post(getAllEventsOfUser);
router.route("/updateeventdetails").post(updateEventDetails);
router.route("/geteventcount").get(getEventCounts)
export default router