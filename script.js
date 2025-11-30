let myChart = null;

function openTab(tabNumber) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab${tabNumber}`).style.display = 'block';
  document.querySelectorAll('.tab-btn')[tabNumber - 1].classList.add('active');
}

function calculateAll() {
  const principal = parseFloat(document.getElementById("principal").value);
  const annualRate = parseFloat(document.getElementById("rate").value);
  const months = parseInt(document.getElementById("months").value);
  const disbursalDate = new Date(document.getElementById("startDate").value);
  let preferredDay = parseInt(document.getElementById("deductionDay").value);

  if (!principal || !annualRate || !months || isNaN(disbursalDate.getTime())) {
    alert("Please fill all required fields correctly!");
    return;
  }

  const monthlyRate = annualRate / 12 / 100;
  const tenure = months;

  // EMI Date Logic
  const d = disbursalDate.getDate();
  let emiDay = preferredDay;
  if (d >= 28 || d <= 2) emiDay = 10;
  else if (d >= 4 && d <= 9) emiDay = 3;
  document.getElementById("deductionDay").value = emiDay;

  // First EMI Date (7–31 days)
  let firstEMI = new Date(disbursalDate.getFullYear(), disbursalDate.getMonth(), emiDay);
  if (firstEMI <= disbursalDate) firstEMI.setMonth(firstEMI.getMonth() + 1);
  let gap = Math.ceil((firstEMI - disbursalDate) / (1000 * 60 * 60 * 24));
  if (gap < 7) firstEMI.setMonth(firstEMI.getMonth() + 1);
  if (gap > 31) {
    const tryCur = new Date(disbursalDate.getFullYear(), disbursalDate.getMonth(), emiDay);
    const tryGap = Math.ceil((tryCur - disbursalDate) / (1000 * 60 * 60 * 24));
    if (tryGap >= 7 && tryGap <= 31) firstEMI = tryCur;
  }

  // EMI Calculation (Bank Ceiling Rounding)
  const power = Math.pow(1 + monthlyRate, tenure);
  const exactEMI = principal * monthlyRate * power / (power - 1);
  const emi = Math.ceil(exactEMI);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - principal;

  // Update EMI Summary
  document.getElementById("emi").textContent = "₹" + emi.toLocaleString("en-IN");
  document.getElementById("total").textContent = "₹" + totalPayable.toLocaleString("en-IN");
  document.getElementById("interest").textContent = "₹" + totalInterest.toLocaleString("en-IN");
  document.getElementById("emiSummary").style.display = "grid";

  // Processing Fees
  const procRate = parseFloat(document.getElementById("procFeeRate").value) / 100 || 0;
  const gstRate = parseFloat(document.getElementById("gstRate").value) / 100 || 0;
  const procFee = Math.round(principal * procRate);
  const gst = Math.round(procFee * gstRate);
  const totalUpfront = procFee + gst;

  document.getElementById("procFee").textContent = "₹" + procFee.toLocaleString("en-IN");
  document.getElementById("gst").textContent = "₹" + gst.toLocaleString("en-IN");
  document.getElementById("totalUpfront").textContent = "₹" + totalUpfront.toLocaleString("en-IN");
  document.getElementById("feeResults").style.display = "block";

  // Pie Chart
  if (myChart) myChart.destroy();
  myChart = new Chart(document.getElementById("pieChart"), {
    type: 'doughnut',
    data: {
      labels: ['Principal', 'Total Interest'],
      datasets: [{ data: [principal, totalInterest], backgroundColor: ['#667eea', '#ff6b6b'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Amortization Table
  const tbody = document.getElementById("amortBody");
  tbody.innerHTML = "";
  let balance = principal;
  let currentDate = new Date(firstEMI);

  for (let i = 1; i <= tenure; i++) {
    const interest = balance * monthlyRate;
    let principalPaid = emi - interest;
    let thisEMI = emi;

    if (i === tenure) {
      principalPaid = balance;
      thisEMI = balance + interest;
    }
    balance -= principalPaid;
    if (balance < 1) balance = 0;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i}</td>
      <td>${currentDate.toLocaleDateString('en-IN')}</td>
      <td>₹${Math.round(thisEMI).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(principalPaid).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(interest).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(balance).toLocaleString('en-IN')}</td>
    `;
    tbody.appendChild(row);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  document.getElementById("pdfBtn").style.display = "block";
}

// PDF Export – Now 100% Working
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  doc.setFontSize(16);
  doc.text("EMI Amortization Schedule", 14, 20);

  doc.setFontSize(10);
  doc.text(`Loan Amount: ₹${parseFloat(document.getElementById("principal").value).toLocaleString("en-IN")}`, 14, 30);
  doc.text(`Interest Rate: ${document.getElementById("rate").value}% p.a.`, 14, 36);
  doc.text(`Tenure: ${document.getElementById("months").value} months`, 14, 42);

  const headers = ["Month", "EMI Date", "EMI (₹)", "Principal (₹)", "Interest (₹)", "Balance (₹)"];
  const data = [];
  document.querySelectorAll("#amortBody tr").forEach(row => {
    const rowData = [];
    row.querySelectorAll("td").forEach(cell => {
      rowData.push(cell.textContent.replace(/₹/g, '').trim());
    });
    data.push(rowData);
  });

  doc.autoTable({
    head: [headers],
    body: data,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [102, 126, 234] }
  });

  doc.save("EMI_Amortization_Schedule.pdf");
}