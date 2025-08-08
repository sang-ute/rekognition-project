// src/controllers/attendanceController.js
import { checkedInUsers } from "./livenessController.js";

export class AttendanceController {
  static getAttendance(req, res) {
    res.json({
      success: true,
      checkedIn: Array.from(checkedInUsers),
      count: checkedInUsers.size,
      timestamp: new Date().toISOString(),
    });
  }

  static clearAttendance(req, res) {
    checkedInUsers.clear();
    console.log("📝 Attendance cleared");

    res.json({
      success: true,
      message: "Attendance cleared successfully",
      timestamp: new Date().toISOString(),
    });
  }
}
