const BASE_URL = "http://localhost:5001/api/jobs";

// GET all jobs
export async function getJobs() {
  const res = await fetch(BASE_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }

  return res.json();
}

// CREATE job
export async function createJob(job: any) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!res.ok) {
    throw new Error("Failed to create job");
  }

  return res.json();
}

// UPDATE job
export async function updateJob(id: number, job: any) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!res.ok) {
    throw new Error("Failed to update job");
  }

  return res.json();
}

// DELETE job
export async function deleteJob(id: number) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete job");
  }
}