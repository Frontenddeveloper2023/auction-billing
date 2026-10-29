export const formatDate = (dateString) => {
  if (!dateString) return "";

  // Hande YYYY-MM-DD string specifically to avoid timezone issues
  if (
    typeof dateString === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};
export const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const options = {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  try {
    const formatter = new Intl.DateTimeFormat("en-IN", options);
    const parts = formatter.formatToParts(date);
    const p = {};
    parts.forEach((part) => {
      p[part.type] = part.value;
    });

    const day = p.day ? String(p.day).padStart(2, "0") : "";
    const month = p.month ? String(p.month).padStart(2, "0") : "";
    const year = p.year;
    const hour = p.hour ? String(p.hour).padStart(2, "0") : "";
    const minute = p.minute ? String(p.minute).padStart(2, "0") : "";
    const dayPeriod = (p.dayPeriod || "").toUpperCase();

    return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`;
  } catch (e) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, "0");

    return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
  }
};

