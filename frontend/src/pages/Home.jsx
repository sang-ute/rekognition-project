import { Link } from 'react-router-dom';
import { Box, Button, Typography, Stack, Card, CardContent } from '@mui/material';

function Home() {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#f5f5f5"
    >
      <Card
        sx={{
          minWidth: 400,
          maxWidth: 500,
          boxShadow: 6,
          borderRadius: 4,
          p: 3,
          background: 'white',
        }}
      >
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
            <Box
              sx={{
                backgroundColor: '#232f3e',
                padding: '8px',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: 2,
              }}
            >
              <img
                src="/FCJ-logo.png"
                alt="Logo"
                style={{ width: 160, height: 80, objectFit: 'contain' }}
              />
            </Box>
            <Typography variant="h4" align="center" fontWeight={700} gutterBottom>
              Welcome to the face "rekognition" website
            </Typography>
          </Box>
          <Stack direction="column" spacing={2} justifyContent="center" width="100%" mt={2}>
            <Button
              component={Link}
              to="/liveness-quickstart"
              variant="contained"
              color="primary"
              size="medium"
              sx={{ flex: 1 }}
            >
              Open checkin camera
            </Button>
            <Button
              component={Link}
              to="/register-faces"
              variant="outlined"
              color="primary"
              size="large"
              sx={{ flex: 1 }}
            >
              Register new faces
            </Button>
            <Button
              component={Link}
              to="/dashboard"
              variant="outlined"
              color="secondary"
              size="large"
              sx={{ flex: 1 }}
            >
              View Dashboard
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 6 }}>
        © {new Date().getFullYear()} First Cloud Journey. All rights reserved.
      </Typography>
    </Box>
  );
}

export default Home;