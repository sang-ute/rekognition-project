import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, CircularProgress, Stack
} from '@mui/material';
import axiosInstance from '../config/axios';

function Dashboard() {
  const [faces, setFaces] = useState([]);
  const [checkedIn, setCheckedIn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [facesResponse, attendanceResponse] = await Promise.all([
        axiosInstance.get('/list-collections'),
        axiosInstance.get('/attendance'),
      ]);

      const facesData = await facesResponse.data;
      const attendanceData = await attendanceResponse.data;

      if (facesData.success) {
        console.log('Faces loaded:', facesData.faces);
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (faceId, s3Key) => {
    const confirm = window.confirm('Are you sure you want to delete this face?');
    if (!confirm) return;

    setDeleting(faceId);
    try {
      const response = await fetch('/delete-face', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceId, s3Key }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchData(); // Refresh after delete
      } else {
        alert(result.error || 'Delete failed');
      }
    } catch (err) {
      alert('Error deleting face: ' + err.message);
    } finally {
      setDeleting('');
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
              {faces.map((face) => (
                <TableRow key={face.FaceId}>
                  <TableCell sx={{ color: checkedIn.includes(face.ExternalImageId) ? 'inherit' : 'red' }}>
                    {face.ExternalImageId}
                  </TableCell>
                  <TableCell>
                    {checkedIn.includes(face.ExternalImageId) ? 'Checked In' : 'Not Checked In'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={deleting === face.FaceId}
                        onClick={() => handleDelete(face.FaceId, face.s3Key)}
                      >
                        {deleting === face.FaceId ? 'Deleting...' : 'Delete'}
                      </Button>
                    </Stack>
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
