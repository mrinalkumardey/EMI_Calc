let myChart = null;

function openTab(n) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab' + n).style.display = 'block';
  document.querySelectorAll('.tab-btn')[n-1].classList.add('active');
}

// TAB 1: EMI Only
function calculateEMIOnly() {
  const p = parseFloat(document.getElementById("principal").value);
  const r = parseFloat(document.getElementById("rate").value);
  const m = parseInt(document.getElementById("months").value);

  if (!p || !r || !m) return alert("Fill all fields in EMI tab!");

  const monthlyRate = r / 12 / 100;
  const power = Math.pow(1 + monthlyRate, m);
  const emi = Math.ceil(p * monthlyRate * power / (power - 1));
  const total = emi * m;
  const interest = total - p;

  document.getElementById("emi").textContent = "₹" + emi.toLocaleString("en-IN");
  document.getElementById("total").textContent = "₹" + total.toLocaleString("en-IN");
  document.getElementById("interest").textContent = "₹" + interest.toLocaleString("en-IN");
  document.getElementById("emiSummary").style.display = "grid";
}

// TAB 2: Fees Only
function calculateFeesOnly() {
  const principal = parseFloat(document.getElementById("fee_principal").value) || 0;
  const procRate = parseFloat(document.getElementById("procFeeRate").value) / 100 || 0;
  const gstRate = parseFloat(document.getElementById("gstRate").value) / 100 || 0;

  if (principal === 0) return alert("Enter loan amount for fee calculation!");

  const procFee = Math.round(principal * procRate);
  const gst = Math.round(procFee * gstRate);
  const totalUpfront = procFee + gst;

  document.getElementById("procFee").textContent = "₹" + procFee.toLocaleString("en-IN");
  document.getElementById("gst").textContent = "₹" + gst.toLocaleString("en-IN");
  document.getElementById("totalUpfront").textContent = "₹" + totalUpfront.toLocaleString("en-IN");
  document.getElementById("feeResults").style.display = "block";
}

// TAB 3: Full Amortization (Independent)
function generateAmortizationOnly() {
  const principal = parseFloat(document.getElementById("amort_principal").value);
  const annualRate = parseFloat(document.getElementById("amort_rate").value);
  const months = parseInt(document.getElementById("amort_months").value);
  const disbursalDate = new Date(document.getElementById("amort_startDate").value);
  let preferredDay = parseInt(document.getElementById("amort_deductionDay").value);

  if (!principal || !annualRate || !months || isNaN(disbursalDate.getTime())) {
    return alert("Fill all fields in Amortization tab!");
  }

  const monthlyRate = annualRate / 12 / 100;
  const d = disbursalDate.getDate();
  let emiDay = preferredDay;
  if (d >= 28 || d <= 2) emiDay = 10;
  else if (d >= 4 && d <= 9) emiDay = 3;

  let firstEMI = new Date(disbursalDate.getFullYear(), disbursalDate.getMonth(), emiDay);
  if (firstEMI <= disbursalDate) firstEMI.setMonth(firstEMI.getMonth() + 1);
  let gap = Math.ceil((firstEMI - disbursalDate) / (86400000));
  if (gap < 7) firstEMI.setMonth(firstEMI.getMonth() + 1);
  if (gap > 31) {
    const tryCur = new Date(disbursalDate.getFullYear(), disbursalDate.getMonth(), emiDay);
    const tryGap = Math.ceil((tryCur - disbursalDate) / 86400000);
    if (tryGap >= 7 && tryGap <= 31) firstEMI = tryCur;
  }

  const power = Math.pow(1 + monthlyRate, months);
  const exactEMI = principal * monthlyRate * power / (power - 1);
  const emi = Math.ceil(exactEMI);
  const total = emi * months;
  const interest = total - principal;

  // Summary
  document.getElementById("amort_emi").textContent = "₹" + emi.toLocaleString("en-IN");
  document.getElementById("amort_total").textContent = "₹" + total.toLocaleString("en-IN");
  document.getElementById("amort_interest").textContent = "₹" + interest.toLocaleString("en-IN");
  document.getElementById("amort_firstEMI").textContent = firstEMI.toLocaleDateString("en-IN");

  // Pie Chart
  if (myChart) myChart.destroy();
  myChart = new Chart(document.getElementById("pieChart"), {
    type: 'doughnut',
    data: { labels: ['Principal', 'Interest'], datasets: [{ data: [principal, interest], backgroundColor: ['#667eea', '#ff6b6b'] }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Table
  const tbody = document.getElementById("amortBody");
  tbody.innerHTML = "";
  let balance = principal;
  let currentDate = new Date(firstEMI);

  for (let i = 1; i <= months; i++) {
    const interestPaid = balance * monthlyRate;
    let principalPaid = emi - interestPaid;
    let thisEMI = emi;
    if (i === months) {
      principalPaid = balance;
      thisEMI = balance + interestPaid;
    }
    balance -= principalPaid;
    if (balance < 1) balance = 0;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i}</td>
      <td>${currentDate.toLocaleDateString('en-IN')}</td>
      <td>₹${Math.round(thisEMI).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(principalPaid).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(interestPaid).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(balance).toLocaleString('en-IN')}</td>
    `;
    tbody.appendChild(row);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  document.getElementById("amortResults").style.display = "block";
}

// PDF Export
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFontSize(16);
  doc.text("EMI Amortization Schedule", 14, 20);

  doc.setFontSize(10);
  doc.text(`Loan: ₹${document.getElementById("amort_principal").value}`, 14, 30);
  doc.text(`Rate: ${document.getElementById("amort_rate").value}% | Tenure: ${document.getElementById("amort_months").value} months`, 14, 36);

  const headers = ["Month", "Date", "EMI", "Principal", "Interest", "Balance"];
  const data = [];
  document.querySelectorAll("#amortBody tr").forEach(r => {
    data.push([...r.cells].map(c => c.textContent.replace(/₹/g, '').trim()));
  });

  doc.autoTable({ head: [headers], body: data, startY: 45, theme: 'grid' });
  doc.save("EMI_Schedule.pdf");
}