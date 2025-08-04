import React from "react";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import { Loader, ThemeProvider } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export function LivenessQuickStartReact() {
  const [loading, setLoading] = React.useState(true);
  const [createLivenessApiData, setCreateLivenessApiData] = React.useState(null);
  const [analysisComplete, setAnalysisComplete] = React.useState(false);
  const [livenessResult, setLivenessResult] = React.useState(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  React.useEffect(() => {
    const fetchCreateLiveness = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}/session`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to create liveness session: ${response.status}`);
        }

        const data = await response.json();
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

      const url = new URL(`/liveness-result/${createLivenessApiData.sessionId}`, apiBaseUrl).href;
      console.log("Fetching liveness result from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(response)

      const json = await response.json();
      console.log("Raw response:", json);

      // Defensive parsing
    //   let data;
    //   try {
    //     data = JSON.parse(text);
    //   } catch (jsonErr) {
    //     throw new Error(`Expected JSON but got: ${text.slice(0, 10000000000000)}...`);
    //   }

      console.log("Analysis results:", json);

      setLivenessResult(json);
      setAnalysisComplete(true);
    } catch (error) {
      console.error("Error fetching liveness session data:", error);
      setLivenessResult({
        error: true,
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
              <p style={{ marginTop: "20px" }}>Analyzing liveness...</p>
            </>
          ) : livenessResult?.error ? (
            <FailureResult message={livenessResult.message} onRetry={handleRetry} />
          ) : livenessResult?.isLive ? (
            <SuccessResult confidence={livenessResult.confidence} />
          ) : (
            <NoLivenessResult reason={livenessResult?.reason} onRetry={handleRetry} />
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
            components={{
              PhotosensitiveWarning: () => null,
            }}
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

// ---------- Reusable Components ----------

const FailureResult = ({ message, onRetry }) => (
  <>
    <div style={styles.errorBox}>
      <h2>❌ Verification Failed</h2>
      <p>{message}</p>
    </div>
    <button style={styles.primaryButton} onClick={onRetry}>
      Try Again
    </button>
  </>
);

const SuccessResult = ({ confidence }) => (
  <>
    <div style={styles.successBox}>
      <h2>✅ Liveness Verified!</h2>
      <p>You have been successfully verified as a live person.</p>
      {confidence && <p>Confidence: {(confidence * 100).toFixed(1)}%</p>}
    </div>
    <button
      style={styles.primaryButton}
      onClick={() => console.log("Proceeding to dashboard...")}
    >
      Continue
    </button>
  </>
);

const NoLivenessResult = ({ reason, onRetry }) => (
  <>
    <div style={styles.warningBox}>
      <h2>⚠️ Liveness Not Detected</h2>
      <p>We couldn't verify that you're a live person. Please try again.</p>
      {reason && <p><strong>Reason:</strong> {reason}</p>}
    </div>
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

// ---------- Styles ----------

const styles = {
  successBox: {
    backgroundColor: "#28a745",
    color: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  errorBox: {
    backgroundColor: "#ff4444",
    color: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  warningBox: {
    backgroundColor: "#ffc107",
    color: "#000",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  primaryButton: {
    padding: "12px 24px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 24px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
