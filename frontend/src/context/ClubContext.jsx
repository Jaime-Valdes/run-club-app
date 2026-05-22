import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const ClubContext = createContext(null);

const NYU_CLUB = {
  name: "NYU Run Club",
  description: "NYU's running community",
  location: "New York, NY",
};

export function ClubProvider({ children }) {
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/clubs/")
      .then(async (clubs) => {
        if (clubs.length > 0) {
          setClub(clubs[0]);
        } else {
          const created = await api.post("/clubs/", NYU_CLUB);
          setClub(created);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClubContext.Provider value={{ club, setClub, loading }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  return useContext(ClubContext);
}
