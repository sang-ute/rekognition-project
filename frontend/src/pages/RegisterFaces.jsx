import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Fade,
  FormControl
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import { motion } from 'framer-motion';

function RegisterFaces() {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    const selected = event.target.files[0];
    setFile(selected);
    if (selected) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(selected);
    }
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
        setMessage(`✅ Face registered successfully for ${result.name}`);
        setName('');
        setFile(null);
        setPreview(null);
      } else {
        setMessage(result.error || '❌ No face detected in image');
      }
    } catch (err) {
      setMessage('❌ Error registering face: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{
        background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
        position: 'relative',
        overflow: 'hidden',
        px: 2
      }}
    >
      {/* Floating blurred blobs */}
      <Box sx={{
        position: 'absolute', width: 300, height: 300,
        background: 'rgba(255,255,255,0.3)', filter: 'blur(100px)',
        borderRadius: '50%', top: 50, left: -100, zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute', width: 400, height: 400,
        background: 'rgba(255,255,255,0.15)', filter: 'blur(150px)',
        borderRadius: '50%', bottom: -50, right: -100, zIndex: 0
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ zIndex: 1 }}
      >
        <Card
          sx={{
            minWidth: { xs: 320, sm: 420 },
            maxWidth: 520,
            p: 4,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <CardContent>
            <Stack alignItems="center" spacing={2}>
              <FaceRetouchingNaturalIcon sx={{ fontSize: 60, color: 'primary.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                Register New Face
              </Typography>
            </Stack>

            <Stack spacing={3} mt={3}>
              <TextField
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ borderRadius: 2 }}
              />

              <FormControl>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 3,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      transition: 'all 0.3s ease',
                    },
                  }}
                  onClick={() => document.getElementById('photo-upload').click()}
                >
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {file ? 'Change Photo' : 'Click or Drag & Drop to Upload'}
                  </Typography>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  {preview && (
                    <Box mt={2}>
                      <img
                        src={preview}
                        alt="preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 180,
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </FormControl>

              <Fade in={!!message}>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    fontWeight: 500,
                    color: message.includes('✅') ? 'success.main' : 'error.main',
                  }}
                >
                  {message}
                </Typography>
              </Fade>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'linear-gradient(90deg, #4facfe, #00f2fe)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
                </Button>
                <Button
                  component={Link}
                  to="/"
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(255,255,255,0.4)',
                    },
                  }}
                >
                  Home
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}

export default RegisterFaces;
