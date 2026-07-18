import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getJobStats,
  listForecastFreshness,
  listJobs,
  listUsers,
  retryJob,
  setUserRole,
  setUserVillage,
  type DomainRole,
  type JobStatus,
} from "./api";

const adminKeys = {
  jobs: (status?: JobStatus) => ["admin", "jobs", status ?? "all"] as const,
  stats: () => ["admin", "jobs", "stats"] as const,
  forecasts: () => ["admin", "forecasts"] as const,
  users: () => ["admin", "users"] as const,
};

export function useJobs(status?: JobStatus) {
  return useQuery({
    queryKey: adminKeys.jobs(status),
    queryFn: () => listJobs(status),
  });
}

export function useJobStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: getJobStats,
  });
}

export function useForecastFreshness() {
  return useQuery({
    queryKey: adminKeys.forecasts(),
    queryFn: listForecastFreshness,
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => retryJob(jobId),
    onSuccess: () => {
      // Retry flips a job back to queued — refresh both the table and the counters.
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: listUsers,
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: DomainRole }) =>
      setUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
  });
}

export function useSetUserVillage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, villageId }: { userId: string; villageId: string | null }) =>
      setUserVillage(userId, villageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
  });
}
