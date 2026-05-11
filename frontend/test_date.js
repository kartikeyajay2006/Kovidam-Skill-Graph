const formatDate = (dateString) => {
    if (!dateString || dateString === "Recently") return "Recently";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      
      const today = new Date();
      const isToday = d.getDate() === today.getDate() && 
                      d.getMonth() === today.getMonth() && 
                      d.getFullYear() === today.getFullYear();
                      
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      if (isToday) return `Today at ${timeStr}`;
      
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${dateStr} at ${timeStr}`;
    } catch (e) {
      return dateString;
    }
  };
console.log(formatDate('2026-05-11T17:59:42.337+00:00'));
