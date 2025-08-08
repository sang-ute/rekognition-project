import React from "react";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import { Loader, ThemeProvider } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../config/axios";
import "./s.css"; // Import your custom styles

export function LivenessQuickStartReact() {
  const [loading, setLoading] = React.useState(true);
  const [createLivenessApiData, setCreateLivenessApiData] = React.useState(null);
  const [analysisComplete, setAnalysisComplete] = React.useState(false);
  const [livenessResult, setLivenessResult] = React.useState(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(true); // Toggle for image preview
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  React.useEffect(() => {
    const fetchCreateLiveness = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/session");

        if (!response.status || response.status !== 200) {
          throw new Error(`Failed to create liveness session: ${response.status}`);
        }

        const data = await response.data;
        console.log("Session data:", data);
        setCreateLivenessApiData(data);
      } catch (error) {
        console.error("Error creating liveness session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreateLiveness();
  }, [apiBaseUrl]);

  const handleAnalysisComplete = async () => {
    if (!createLivenessApiData?.sessionId) {
      console.error("No session ID available");
      return;
    }

    try {
      setAnalysisLoading(true);

      // Add preview parameter if enabled
      const previewParam = showPreview ? "?preview=true" : "";
      const url = `${apiBaseUrl}/liveness-result/${createLivenessApiData.sessionId}${previewParam}`;

      console.log("Fetching liveness result from:", url);

      const response = await axiosInstance.get(url);

      if (!response.status || response.status !== 200) {
        throw new Error(`Failed to fetch liveness result: ${response.status}`);
      }

      const json = await response.data;
      console.log("Analysis results:", json);

      // Log detailed information about captured image
      if (json.capturedImage?.details) {
        console.log("📸 Captured Image Details:");
        console.log(`   Size: ${json.capturedImage.details.sizeKB} KB`);
        console.log(`   Format: ${json.capturedImage.details.format}`);
        console.log(`   Valid: ${json.capturedImage.details.isValid}`);
      }

      setLivenessResult(json);
      setAnalysisComplete(true);

      // Auto-navigate to dashboard on successful match (after showing preview)
      if (json.success && json.isLive && json.faceMatch?.found) {
        setTimeout(() => {
          navigate("/dashboard");
        }, showPreview ? 5000 : 2000); // Longer delay if showing preview
      }
    } catch (error) {
      console.error("Error fetching liveness session data:", error);
      setLivenessResult({
        error: true,
        success: false,
        message: "Failed to verify liveness. Please try again.",
      });
      setAnalysisComplete(true);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleRetry = () => {
    setAnalysisComplete(false);
    setLivenessResult(null);
    window.location.reload();
  };

  if (analysisComplete) {
    return (
      <ThemeProvider>
        <div style={styles.centered}>
          {analysisLoading ? (
            <>
              <Loader />
              <p style={{ marginTop: "20px" }}>Analyzing liveness and matching face...</p>
            </>
          ) : livenessResult?.error || !livenessResult?.success ? (
            <FailureResult 
              message={livenessResult?.message || "Verification failed"} 
              onRetry={handleRetry} 
              capturedImage={livenessResult?.capturedImage}
            />
          ) : livenessResult?.isLive && livenessResult?.faceMatch?.found ? (
            <SuccessResult 
              confidence={livenessResult.confidence} 
              name={livenessResult.faceMatch.name}
              similarity={livenessResult.faceMatch.similarity}
              onContinue={() => navigate("/dashboard")}
              capturedImage={livenessResult.capturedImage}
              allMatches={livenessResult.faceMatch.allMatches}
            />
          ) : livenessResult?.isLive && !livenessResult?.faceMatch?.found ? (
            <UnknownFaceResult 
              confidence={livenessResult.confidence}
              onRetry={handleRetry}
              capturedImage={livenessResult.capturedImage}
              onRegister={() => {
                console.log("Navigate to registration with captured image");
              }}
            />
          ) : (
            <NoLivenessResult 
              reason={livenessResult?.reason} 
              onRetry={handleRetry}
              capturedImage={livenessResult?.capturedImage}
            />
          )}
        </div>
      </ThemeProvider>
    );
  }

  if (!loading && !createLivenessApiData) {
    return (
      <ThemeProvider>
        <div style={styles.centered}>
          <p>Failed to initialize liveness detection. Please try again.</p>
          <button style={styles.primaryButton} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {loading ? (
        <Loader />
      ) : (
        <div style={styles.fullScreen}>
          <FaceLivenessDetector
            sessionId={createLivenessApiData.sessionId}
            region="us-east-1"
            onAnalysisComplete={handleAnalysisComplete}
            onError={(error) => console.error("Liveness detection error:", error)}

            config={{
              faceDistanceThreshold: {
                min: 0.15,
                max: 0.4,
              },
            }}
          />
        </div>
      )}
    </ThemeProvider>
  );
}

// ---------- Enhanced Result Components with Image Preview ----------

const ImagePreview = ({ capturedImage, title = "Captured Image" }) => {
  if (!capturedImage?.found) return null;

  return (
    <div style={styles.imagePreviewContainer}>
      <h4 style={styles.imagePreviewTitle}>{title}</h4>
      
      {capturedImage.previewUrl && (
        <div style={styles.imageWrapper}>
          <img 
            src={capturedImage.previewUrl} 
            alt="Captured face" 
            style={styles.previewImage}
          />
        </div>
      )}
      
      {capturedImage.details && (
        <div style={styles.imageDetails}>
          <p><strong>Size:</strong> {capturedImage.details.sizeKB} KB</p>
          <p><strong>Format:</strong> {capturedImage.details.format}</p>
          <p><strong>Valid:</strong> {capturedImage.details.isValid ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
};

const FailureResult = ({ message, onRetry, capturedImage }) => (
  <>
    <div style={styles.errorBox}>
      <h2>Verification Failed</h2>
      <p>{message}</p>
    </div>
    
    <ImagePreview capturedImage={capturedImage} title="Image from Failed Attempt" />
    
    <button style={styles.primaryButton} onClick={onRetry}>
      Try Again
    </button>
  </>
);

const SuccessResult = ({ confidence, name, similarity, onContinue, capturedImage, allMatches }) => (
  <>
    <div style={styles.successBox}>
      <h2>Welcome {name}!</h2>
      <p>You have been successfully verified and checked in.</p>
      <div style={styles.details}>
        {confidence && <p>Liveness Confidence: {(confidence * 100).toFixed(1)}%</p>}
        {similarity && <p>Face Match: {similarity.toFixed(1)}%</p>}
      </div>
    </div>

    <ImagePreview capturedImage={capturedImage} title="Your Captured Photo" />

    {/* Show all matches if multiple found */}
    {allMatches && allMatches.length > 1 && (
      <div style={styles.allMatchesContainer}>
        <h4>All Face Matches Found:</h4>
        {allMatches.slice(0, 3).map((match, index) => (
          <div key={index} style={styles.matchItem}>
            <span>{match.name}: {match.similarity.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    )}
    
    <button style={styles.primaryButton} onClick={onContinue}>
      Continue to Dashboard
    </button>
  </>
);

const UnknownFaceResult = ({ confidence, onRetry, onRegister, capturedImage }) => (
  <>
    <div style={styles.warningBox}>
      <h2>Face Not Recognized</h2>
      <p>You are verified as a live person, but your face is not in our system.</p>
      {confidence && <p>Liveness Confidence: {(confidence * 100).toFixed(1)}%</p>}
    </div>

    <ImagePreview capturedImage={capturedImage} title="Your Unrecognized Face" />
    
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <button style={styles.primaryButton} onClick={onRegister}>
        Register This Face
      </button>
      <button style={styles.secondaryButton} onClick={onRetry}>
        Try Again
      </button>
    </div>
  </>
);

const NoLivenessResult = ({ reason, onRetry, capturedImage }) => (
  <>
    <div style={styles.warningBox}>
      <h2>Liveness Not Detected</h2>
      <p>We couldn't verify that you're a live person. Please try again.</p>
      {reason && <p><strong>Reason:</strong> {reason}</p>}
    </div>

    <ImagePreview capturedImage={capturedImage} title="Image from Failed Liveness Check" />
    
    <div style={{ display: "flex", gap: "10px" }}>
      <button style={styles.primaryButton} onClick={onRetry}>
        Try Again
      </button>
      <button
        style={styles.secondaryButton}
        onClick={() => console.log("Alternative verification or exit")}
      >
        Skip for Now
      </button>
    </div>
  </>
);

// ---------- Enhanced Styles ----------

const styles = {
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    // minHeight: "100vh",
    padding: "20px",
  },
  fullScreen: {
    width: "100vw",
    height: "90vh",
    position: "relative",
  },
  settingsPanel: {
    position: "absolute",
    top: "10px",
    right: "30px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "8px",
    boxSizing: "border-box",
    zIndex: 1000,
  },
  settingLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    cursor: "pointer",
  },
  checkbox: {
    marginRight: "8px",
  },
  successBox: {
    backgroundColor: "#28a745",
    color: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    maxWidth: "500px",
  },
  errorBox: {
    backgroundColor: "#ff4444",
    color: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    maxWidth: "500px",
  },
  warningBox: {
    backgroundColor: "#ffc107",
    color: "#000",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    maxWidth: "500px",
  },
  details: {
    marginTop: "10px",
    fontSize: "0.9em",
    opacity: "0.9",
  },
  imagePreviewContainer: {
    backgroundColor: "#f8f9fa",
    border: "2px solid #dee2e6",
    borderRadius: "8px",
    padding: "15px",
    margin: "15px 0",
    maxWidth: "400px",
    textAlign: "center",
  },
  imagePreviewTitle: {
    margin: "0 0 10px 0",
    color: "#495057",
    fontSize: "16px",
  },
  imageWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "10px",
  },
  previewImage: {
    maxWidth: "300px",
    maxHeight: "300px",
    border: "2px solid #007bff",
    borderRadius: "8px",
    objectFit: "cover",
  },
  imageDetails: {
    fontSize: "12px",
    color: "#6c757d",
    textAlign: "left",
    backgroundColor: "#e9ecef",
    padding: "8px",
    borderRadius: "4px",
    marginTop: "10px",
  },
  allMatchesContainer: {
    backgroundColor: "#e7f3ff",
    border: "1px solid #b3d9ff",
    borderRadius: "8px",
    padding: "15px",
    margin: "15px 0",
    maxWidth: "400px",
  },
  matchItem: {
    padding: "5px 0",
    borderBottom: "1px solid #ccc",
    fontSize: "14px",
  },
  primaryButton: {
    padding: "12px 24px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
    margin: "5px",
  },
  secondaryButton: {
    padding: "12px 24px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
    margin: "5px",
  },
};