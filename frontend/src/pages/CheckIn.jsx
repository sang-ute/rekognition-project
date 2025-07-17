import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material';

function CheckIn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function startVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setMessage('Failed to access webcam');
      }
    }
    startVideo();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndCheckIn = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsLoading(true);
    setMessage('');

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const formData = new FormData();
      formData.append('photo', blob, 'checkin.jpg');

      const response = await fetch('/checkin', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        setMessage('Check-in successful');
      } else {
        setMessage(result.message || 'No match found');
      }
    } catch (err) {
      setMessage('Error during check-in: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#f5f5f5"
    >
      <Typography variant="h4" gutterBottom>
        Check-In Camera
      </Typography>
      <Box mb={2}>
        <video ref={videoRef} autoPlay style={{ width: '100%', maxWidth: '600px' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Box>
      {message && (
        <Typography variant="body1" color={message.includes('Error') ? 'error' : 'text.primary'} mb={2}>
          {message}
        </Typography>
      )}
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={captureAndCheckIn}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Check In'}
        </Button>
        <Button component={Link} to="/" variant="outlined" color="primary">
          Back to Home
        </Button>
      </Stack>
    </Box>
  );
}

export default CheckIn;