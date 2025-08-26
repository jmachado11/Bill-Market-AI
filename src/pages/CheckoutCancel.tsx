import { useNavigate } from "react-router-dom";

const CheckoutCancel = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Payment cancelled</h1>
      <p className="mb-8">No worries—your card was not charged.</p>
      <button
        onClick={() => navigate("/app")}
        className="px-6 py-3 bg-secondary rounded-lg hover:bg-secondary/90"
      >
        Return to site
      </button>
    </div>
  );
};

export default CheckoutCancel;