import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/src/core/api/api-client';

export function useAssessmentSession(sessionId: string, isDoctor: boolean) {
  const queryClient = useQueryClient();

  const { data: session, isLoading: loading, error } = useQuery({
    queryKey: ['assessmentSession', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      return fetchApi(`/assessment-sessions/${sessionId}`);
    },
    enabled: !!sessionId,
  });

  const scoringMutation = useMutation({
    mutationFn: async () => {
      await fetchApi(`/reports/generate/${sessionId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessmentSession', sessionId] });
    },
    onError: () => {
      alert("Failed to generate report");
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ generatedReportId, feedbackNotes }: { generatedReportId?: string, feedbackNotes: string }) => {
      if (!isDoctor) throw new Error("Unauthorized");
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessmentSession', sessionId] });
    },
    onError: () => {
      alert("Failed to approve assessment");
    }
  });

  return {
    session,
    loading,
    error: error ? (error as Error).message : "",
    submittingFeedback: feedbackMutation.isPending,
    feedbackSuccess: feedbackMutation.isSuccess,
    triggerScoring: scoringMutation.mutateAsync,
    submitFeedback: (generatedReportId: string | undefined, feedbackNotes: string) => 
      feedbackMutation.mutateAsync({ generatedReportId, feedbackNotes })
  };
}
