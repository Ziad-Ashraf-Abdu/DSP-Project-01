// components/ImageUpload.js
import React, { useCallback, useState } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { useDropzone } from 'react-dropzone';

const ImageUpload = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.tiff', '.tif', '.geotiff', '.png', '.jpg', '.jpeg']
    },
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDrop: () => setIsDragging(false)
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 3,
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'grey.700',
        backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'rgba(59, 130, 246, 0.05)'
        }
      }}
    >
      <input {...getInputProps()} />
      <Box>
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Click to upload SAR data or drag and drop
        </Typography>
        <Typography variant="body2" color="primary.light">
          TIFF, GeoTIFF, PNG, JPG
        </Typography>
      </Box>
    </Paper>
  );
};

export default ImageUpload;