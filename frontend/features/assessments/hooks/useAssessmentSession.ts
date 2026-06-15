import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';

export function useAssessmentSession(sessionId: string, isDoctor: boolean) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await fetchApi(`/assessment-sessions/${sessionId}`);
        setSession(data);
      } catch (err) {
        setError("Could not load the assessment session.");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const triggerScoring = async () => {
    setLoading(true);
    try {
      await fetchApi(`/reports/generate/${sessionId}`, { method: "POST" });
      const data = await fetchApi(`/assessment-sessions/${sessionId}`);
      setSession(data);
    } catch(err) {
      alert("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (generatedReportId: string | undefined, feedbackNotes: string) => {
    if (!isDoctor) return;
    setSubmittingFeedback(true);
    try {
      if (generatedReportId) {
          if (feedbackNotes) {
             await fetchApi(`/reports/${generatedReportId}/sections`, {
                method: "PATCH",
                body: JSON.stringify({ name: "Clinical Notes", content: feedbackNotes, order: 100 })
             });
          }
          await fetchApi(`/reports/${generatedReportId}/approve`, {
            method: "PATCH",
          });
      } else {
          await fetchApi(`/assessment-sessions/${sessionId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "APPROVED" })
          });
      }
      setFeedbackSuccess(true);
      setSession({ ...session, status: "APPROVED" });
    } catch(err) {
      alert("Failed to approve assessment");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return {
    session,
    loading,
    error,
    submittingFeedback,
    feedbackSuccess,
    triggerScoring,
    submitFeedback
  };
}
