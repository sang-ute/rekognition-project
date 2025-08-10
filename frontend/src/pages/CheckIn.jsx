import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Box, Button, Typography, Stack, CircularProgress, Paper, Alert } from "@mui/material";
import axiosInstance from "../config/axios";
import axios from "axios";

// Mock FaceLivenessDetector
const FaceLivenessDetector = ({ sessionId, region, onAnalysisComplete, onError }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onAnalysisComplete({ Confidence: 95 });
        }, 2000);
        return () => clearTimeout(timer);
    }, [onAnalysisComplete]);
    return <Typography>Performing liveness detection...</Typography>;
};

// ImagePreview component to display captured image
const ImagePreview = ({ capturedImage, title = "Captured Image" }) => {
    if (!capturedImage?.found) return null;
    return (
        <Box sx={{ mt: 2, p: 2, bgcolor: "#f8f9fa", borderRadius: 2, border: "2px solid #dee2e6", maxWidth: 400, textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 1, color: "#495057" }}>
                {title}
            </Typography>
            {capturedImage.previewUrl && (
                <Box sx={{ mb: 1, display: "flex", justifyContent: "center" }}>
                    <img
                        src={capturedImage.previewUrl}
                        alt="Captured face"
                        style={{ maxWidth: "300px", maxHeight: "300px", border: "2px solid #1976d2", borderRadius: "8px", objectFit: "cover" }}
                    />
                </Box>
            )}
            {capturedImage.details && (
                <Box sx={{ fontSize: "0.75rem", color: "#6c757d", bgcolor: "#e9ecef", p: 1, borderRadius: 1 }}>
                    <Typography>
                        <strong>Size:</strong> {capturedImage.details.sizeKB} KB
                    </Typography>
                    <Typography>
                        <strong>Format:</strong> {capturedImage.details.format}
                    </Typography>
                    <Typography>
                        <strong>Valid:</strong> {capturedImage.details.isValid ? "Yes" : "No"}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

function CheckIn() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [livenessSessionId, setLivenessSessionId] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null); // State for captured image

    useEffect(() => {
        async function startVideo() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
                setMessage("Failed to access webcam. Please ensure camera permissions are granted.");
            }
        }
        startVideo();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const captureAndCheckIn = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsLoading(true);
        setMessage("");

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg"));
            const formData = new FormData();
            formData.append("photo", blob, "checkin.jpg");

            const response = await axiosInstance.post("/checkin", formData);

            const result = response.data;

            console.log(result);

            setMessage(result.success ? `Check-in successful! Welcome ${result.name}` : result.message || "No match found");
            setCapturedImage(result.capturedImage); // Store captured image data
        } catch (err) {
            setMessage(`Error during check-in: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLivenessDetection = async () => {
        setMessage("");
        setIsLoading(true);

        try {
            const response = await axios.get("/liveness");
            const data = await response.data;

            if (data.sessionId) {
                setLivenessSessionId(data.sessionId);
            } else {
                throw new Error("No session ID received");
            }
        } catch (err) {
            setMessage(`Failed to start liveness session: ${err.message}`);
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#f0f2f5",
                px: { xs: 2, sm: 4 },
                py: 4,
            }}
        >
            <Paper elevation={6} sx={{ p: { xs: 2, sm: 4 }, width: "100%", maxWidth: 600, borderRadius: 2, bgcolor: "white" }}>
                <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: "bold", color: "#1976d2" }}>
                    Face Check-In
                </Typography>

                <Box
                    my={3}
                    sx={{ position: "relative", width: "100%", aspectRatio: "4/3", bgcolor: "#000", borderRadius: "8px", overflow: "hidden" }}
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        aria-label="Webcam feed for face check-in"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    {isLoading && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "rgba(0,0,0,0.5)",
                            }}
                        >
                            <CircularProgress color="primary" />
                        </Box>
                    )}
                </Box>

                {message && (
                    <Alert severity={message.includes("Error") || message.includes("Failed") ? "error" : "success"} sx={{ my: 2 }}>
                        {message}
                    </Alert>
                )}

                {capturedImage && <ImagePreview capturedImage={capturedImage} title="Captured Check-In Photo" />}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mb={3}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={captureAndCheckIn}
                        disabled={isLoading || livenessSessionId}
                        aria-label="Perform face check-in"
                        sx={{ py: 1.5, fontSize: "1rem" }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Check In"}
                    </Button>

                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleLivenessDetection}
                        disabled={isLoading || livenessSessionId}
                        aria-label="Start liveness detection"
                        sx={{ py: 1.5, fontSize: "1rem" }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : "Start Liveness Check"}
                    </Button>

                    <Button
                        variant="outlined"
                        color="primary"
                        component={Link}
                        to="/"
                        disabled={isLoading}
                        aria-label="Return to home page"
                        sx={{ py: 1.5, fontSize: "1rem" }}
                    >
                        Back to Home
                    </Button>
                </Stack>

                {livenessSessionId && (
                    <Box mt={3}>
                        <FaceLivenessDetector
                            sessionId={livenessSessionId}
                            region="us-east-1"
                            onAnalysisComplete={(result) => {
                                console.log("Liveness Result:", result);
                                setMessage(
                                    result?.Confidence && result.Confidence > 90
                                        ? "Liveness confirmed with high confidence."
                                        : "Liveness result not confident."
                                );
                                setLivenessSessionId(null);
                                setIsLoading(false);
                            }}
                            onError={(err) => {
                                console.error("Liveness error:", err);
                                setMessage(`Liveness detection failed: ${err.message}`);
                                setLivenessSessionId(null);
                                setIsLoading(false);
                            }}
                        />
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

export default CheckIn;
