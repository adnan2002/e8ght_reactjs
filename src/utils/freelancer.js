const isRecord = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

const pickCandidate = (candidate) => (isRecord(candidate) ? candidate : null);

export const extractFreelancerProfile = (payload) => {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates = [
    payload.freelancer,
    payload.data?.freelancer,
    payload.result?.freelancer,
    payload.payload?.freelancer,
    payload.freelancerProfile,
    payload.profile,
    payload,
  ];

  for (const candidate of candidates) {
    const profile = pickCandidate(candidate);
    if (profile) {
      return profile;
    }
  }

  return null;
};

export default extractFreelancerProfile;


