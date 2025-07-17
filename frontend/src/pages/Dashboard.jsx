import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress } from '@mui/material';

function Dashboard() {
  const [faces, setFaces] = useState([]);
  const [checkedIn, setCheckedIn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [facesResponse, attendanceResponse] = await Promise.all([
          fetch('/list-collections'),
          fetch('/attendance')
        ]);

        const facesData = await facesResponse.json();
        const attendanceData = await attendanceResponse.json();

        if (facesData.success) {
          setFaces(facesData.faces);
        } else {
          setError(facesData.error || 'Failed to load faces');
        }

        if (attendanceData.success) {
          setCheckedIn(attendanceData.checkedIn);
        } else {
          setError(attendanceData.error || 'Failed to load attendance');
        }
      } catch (err) {
        setError('Error fetching data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#f5f5f5"
      p={3}
    >
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
        <TableContainer component={Paper} sx={{ maxWidth: 600 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faces.map((face) => (
                <TableRow key={face.FaceId}>
                  <TableCell sx={{ color: checkedIn.includes(face.ExternalImageId) ? 'inherit' : 'red' }}>
                    {face.ExternalImageId}
                  </TableCell>
                  <TableCell>
                    {checkedIn.includes(face.ExternalImageId) ? 'Checked In' : 'Not Checked In'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Button
        component={Link}
        to="/"
        variant="outlined"
        color="primary"
        sx={{ mt: 3 }}
      >
        Back to Home
      </Button>
    </Box>
  );
}

export default Dashboard;