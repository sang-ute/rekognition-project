import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    CircularProgress,
    Stack,
} from "@mui/material";
import axiosInstance from "../config/axios";

function Dashboard() {
    const [faces, setFaces] = useState([]);
    const [checkedInMap, setCheckedInMap] = useState({}); // { externalImageId: true/false }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            // 1. Lấy danh sách faces
            const facesResponse = await axiosInstance.get("/list-collections");
            if (!facesResponse.data.success) {
                throw new Error(facesResponse.data.error || "Failed to load faces");
            }
            const facesData = facesResponse.data.faces;
            setFaces(facesData);

            // 2. Với mỗi face, gọi /attendance?externalImageId= để lấy checkin hôm nay
            const attendanceResults = await Promise.all(
                facesData.map(async (face) => {
                    try {
                        const res = await axiosInstance.get("/attendance", {
                            params: { externalImageId: face.ExternalImageId },
                        });
                        if (res.data.success && res.data.count > 0) {
                            return { id: face.ExternalImageId, checkedIn: true };
                        } else {
                            return { id: face.ExternalImageId, checkedIn: false };
                        }
                    } catch {
                        return { id: face.ExternalImageId, checkedIn: false };
                    }
                })
            );

            // 3. Tạo map externalImageId => checkedIn
            const checkedMap = {};
            attendanceResults.forEach((item) => {
                checkedMap[item.id] = item.checkedIn;
            });
            setCheckedInMap(checkedMap);
        } catch (err) {
            setError("Error fetching data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (faceId, s3Key) => {
        const confirm = window.confirm("Are you sure you want to delete this face?");
        if (!confirm) return;

        setDeleting(faceId);
        console.log("Deleting face:", faceId, "with S3 key:", s3Key);
        try {
            const response = await axiosInstance.delete("/delete-face", {
                data:{faceId, s3Key,}
            });
            const result = await response.data;
            if (result.success) {
                await fetchData(); // Refresh after delete
            } else {
                alert(result.error || "Delete failed");
            }
        } catch (err) {
            alert("Error deleting face: " + err.message);
        } finally {
            setDeleting("");
        }
    };

    return (
        <Box minHeight="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" bgcolor="#f5f5f5" p={3}>
            <Typography variant="h4" gutterBottom>
                Attendance Dashboard
            </Typography>
            {loading && <CircularProgress />}
            {error && (
                <Typography color="error" mb={2}>
                    {error}
                </Typography>
            )}
            {!loading && !error && (
                <TableContainer component={Paper} sx={{ maxWidth: 800 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {faces.map((face) => {
                                const checked = checkedInMap[face.ExternalImageId] || false;
                                return (
                                    <TableRow key={face.FaceId}>
                                        <TableCell sx={{ color: checked ? "inherit" : "red" }}>
                                            {face.ExternalImageId.split("_").slice(1).join(" ")}
                                        </TableCell>
                                        <TableCell>{checked ? "Checked In" : "Not Checked In"}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    disabled={deleting === face.FaceId}
                                                    onClick={() => handleDelete(face.FaceId, face.s3Key)}
                                                >
                                                    {deleting === face.FaceId ? "Deleting..." : "Delete"}
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <Button component={Link} to="/" variant="outlined" color="primary" sx={{ mt: 3 }}>
                Back to Home
            </Button>
        </Box>
    );
}

export default Dashboard;
