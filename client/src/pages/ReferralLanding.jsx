import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function ReferralLanding() {
  const { code } = useParams();
  const navigate = useNavigate();
  const clerk = useClerk();

  useEffect(() => {
    if (code) {
      localStorage.setItem("xlchess_referral", code);
    }
    
    // Redirect to home and open sign up modal
    navigate("/");
    setTimeout(() => {
      clerk.openSignUp();
    }, 100);
  }, [code, navigate, clerk]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-ink text-paper">
      <div className="animate-pulse">Loading referral...</div>
    </div>
  );
}
