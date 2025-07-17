import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Typography, Stack, Card, CardContent, TextField, CircularProgress } from '@mui/material';

function RegisterFaces() {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!name || !file) {
      setMessage('Please provide a name and select a photo');
      return;
    }
    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('photo', file);

    try {
      const response = await fetch('/index-face', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        setMessage(`Face registered successfully for ${result.name}`);
        setName('');
        setFile(null);
      } else {
        setMessage(result.error || 'No face detected in image');
      }
    } catch (err) {
      setMessage('Error registering face: ' + err.message);
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
      <Card sx={{ minWidth: 400, maxWidth: 500, p: 3, boxShadow: 6, borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom align="center">
            Register New Faces
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <Box>
              <Typography variant="body1" gutterBottom>
                Upload Photo:
              </Typography>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ width: '100%' }}
              />
            </Box>
            {message && (
              <Typography variant="body1" color={message.includes('Error') ? 'error' : 'text.primary'}>
                {message}
              </Typography>
            )}
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
              <Button component={Link} to="/" variant="outlined" color="primary">
                Back to Home
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default RegisterFaces;