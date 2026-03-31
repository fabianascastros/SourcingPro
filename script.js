// Global Chart Instances
let pvChart = null, pieChart = null, sensChart = null;

// Authentication Logic

const LOGIN_PASS = "1234";
const PATTERN_CORRECT = "0125"; // L-shape sequence indices
let currentPattern = "";

// Login State Toggle
document.getElementById('to-pattern-btn')?.addEventListener('click', () => {
  document.getElementById('password-view').style.display = 'none';
  document.getElementById('pattern-view').style.display = 'block';
  lucide.createIcons();
});

document.getElementById('to-password-btn')?.addEventListener('click', () => {
  document.getElementById('pattern-view').style.display = 'none';
  document.getElementById('password-view').style.display = 'block';
});

// SUCCESS LOGIN FUNCTION
function unlockSystem() {
  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.querySelector('.app-container');
  
  loginScreen.style.opacity = '0';
  setTimeout(() => {
    loginScreen.style.display = 'none';
    appContainer.style.display = 'grid';
    
    // Force info-sidebar visibility on initial load
    const infoSidebar = document.querySelector('.info-sidebar');
    if (infoSidebar) {
      infoSidebar.style.display = 'flex';
      appContainer.style.gridTemplateColumns = '260px 1fr 380px';
    }
    
    lucide.createIcons();
    calculateImpact();
  }, 500);
}


// Password Submit
document.getElementById('login-submit-btn')?.addEventListener('click', () => {
  const input = document.getElementById('login-password');
  if (input.value === LOGIN_PASS) {
    unlockSystem();
  } else {
    alert("Senha incorreta. Tente '1234'");
    input.value = "";
    input.focus();
  }
});

document.getElementById('login-password')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('login-submit-btn').click();
});

// Pattern Submit Logic
document.querySelectorAll('.dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = dot.getAttribute('data-index');
    if (dot.classList.contains('active')) return;
    
    dot.classList.add('active');
    currentPattern += idx;

    if (currentPattern.length === PATTERN_CORRECT.length) {
      if (currentPattern === PATTERN_CORRECT) {
        unlockSystem();
      } else {
        alert("Padrão incorreto! Tente a sequência: Topo (Esquerda -> Direita) e desça na direita.");
        resetPattern();
      }
    }
  });
});

function resetPattern() {
  currentPattern = "";
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
}

// Tab Switching Logic
document.querySelectorAll('.nav-links li').forEach(item => {
  item.addEventListener('click', () => {
    const tabId = item.getAttribute('data-tab');
    if (!tabId) return;

    // Remove active from all links and tabs
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));

    // Set new active
    item.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Show info sidebar persistently as requested
    const infoSidebar = document.querySelector('.info-sidebar');
    infoSidebar.style.display = 'flex';
    document.querySelector('.app-container').style.gridTemplateColumns = '260px 1fr 380px';

    lucide.createIcons();

    // PERSISTENCE: Refresh charts when entering Visual Analysis tab
    if (tabId === 'charts-tab') {
      setTimeout(() => {
          const lastData = JSON.parse(localStorage.getItem('last_calculation') || '{}');
          if (lastData.fv) {
            updateCharts(lastData.fv, lastData.d1, lastData.d2, lastData.rate);
          }
      }, 50); // Small delay to ensure tab is visible for Chart.js
    }
  });
});




document.getElementById('calculate-btn')?.addEventListener('click', calculateImpact);

// Auto-update interest rate based on value (Threshold 200k)
function updateInterestRateByValue(valueId, rateId) {
  const val = parseFloat(document.getElementById(valueId).value) || 0;
  const rateInput = document.getElementById(rateId);
  if (val > 200000) {
    rateInput.value = "1.43";
  } else {
    rateInput.value = "1.15";
  }
}

// Format Currency Utility
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatPct = (val) => val.toFixed(2) + '%';


document.getElementById('purchase-value')?.addEventListener('input', () => {
  updateInterestRateByValue('purchase-value', 'interest-rate');
});

document.getElementById('inst-value')?.addEventListener('input', () => {
  updateInterestRateByValue('inst-value', 'inst-rate');
});

function calculateImpact() {
  const value = parseFloat(document.getElementById('purchase-value').value);
  const currentDays = parseInt(document.getElementById('current-term').value);
  const newDays = parseInt(document.getElementById('new-term').value);
  const monthlyRate = parseFloat(document.getElementById('interest-rate').value) / 100;
  
  if (isNaN(value) || isNaN(currentDays) || isNaN(newDays) || isNaN(monthlyRate)) {
    alert("Por favor, preencha todos os campos corretamente.");
    return;
  }

  // Monthly installments periods calculation (n = days / 30)

  const nOld = currentDays / 30;
  const nNew = newDays / 30;

  // PV Formula: FV / (1 + i)^n
  const pvOld = value / Math.pow((1 + monthlyRate), nOld);
  const pvNew = value / Math.pow((1 + monthlyRate), nNew);


  const diff = pvOld - pvNew;
  const gainPct = (diff / pvOld) * 100;

  // Updating UI
  document.getElementById('res-pv-current').textContent = formatCurrency(pvOld);
  document.getElementById('res-pv-new').textContent = formatCurrency(pvNew);
  document.getElementById('res-diff').textContent = formatCurrency(diff);
  document.getElementById('res-gain-pct').textContent = formatPct(gainPct);

  // Update Negotiation Script
  generateNegotiationScript(value, currentDays, newDays, diff, gainPct);


  // Strategic Summary update
  const summary = document.getElementById('summary-text');
  const sourcing = document.getElementById('sourcing-text');

  if (newDays > currentDays) {
    summary.innerHTML = `Ao estender o prazo para <b>${newDays} dias</b>, você reduz o custo financeiro implícito da compra em <b>${formatCurrency(diff)}</b>.`;
    sourcing.innerHTML = `<b>Recomendação:</b> Busque consolidar este prazo nas próximas negociações de categoria, pois o ganho financeiro de <b>${formatPct(gainPct)}</b> impacta diretamente o fluxo de caixa e a liquidez da operação sem alterar o custo unitário do fornecedor.`;
  } else if (newDays < currentDays) {
    summary.innerHTML = `A redução do prazo para <b>${newDays} dias</b> encarece o valor presente do contrato em <b>${formatCurrency(Math.abs(diff))}</b>.`;
    sourcing.innerHTML = `<b>Atenção:</b> Esta antecipação de desembolso só faz sentido se acompanhada de uma redução nominal no preço de face de, no mínimo, <b>${formatPct(Math.abs(gainPct))}</b>.`;
  } else {
    summary.innerHTML = `Os prazos são idênticos. O valor presente da transação é <b>${formatCurrency(pvOld)}</b>.`;
    sourcing.innerHTML = `Não há alteração no fluxo de caixa estratégico com este cenário.`;
  }
  updateCharts(value, currentDays, newDays, monthlyRate);

  // SAVE LAST CALCULATION for "Analise Visual" Persistence
  localStorage.setItem('last_calculation', JSON.stringify({
    fv: value,
    d1: currentDays,
    d2: newDays,
    rate: monthlyRate
  }));
}



// Initial Run
window.onload = () => {
  calculateImpact();
  loadHistory();
};

function saveToHistory(entry) {
  let history = JSON.parse(localStorage.getItem('sourcing_history') || '[]');
  history.unshift(entry); // Add to beginning
  if (history.length > 50) history.pop(); // Keep last 50
  localStorage.setItem('sourcing_history', JSON.stringify(history));
  renderHistory();
}

function loadHistory() {
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('sourcing_history') || '[]');
  const tableBody = document.getElementById('history-table-body');
  const totalMetric = document.getElementById('total-savings-metric');
  
  if (!tableBody) return;

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatPct = (val) => val.toFixed(2) + '%';

  let totalSavings = 0;

  if (history.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #64748b;">Nenhum histórico encontrado.</td></tr>`;
    if (totalMetric) totalMetric.textContent = formatCurrency(0);
    return;
  }

  tableBody.innerHTML = history.map(item => {
    totalSavings += item.economy;
    return `
      <tr style="border-bottom: 1px solid var(--glass-border); font-size: 0.9rem;">
        <td style="padding: 1rem; color: #94a3b8;">${item.date}</td>
        <td style="padding: 1rem;">${formatCurrency(item.value)}</td>
        <td style="padding: 1rem;">${item.terms}</td>
        <td style="padding: 1rem; color: ${item.economy >= 0 ? '#10b981' : '#f87171'}; font-weight: 600;">
          ${formatCurrency(item.economy)}
        </td>
        <td style="padding: 1rem; color: var(--primary);">${formatPct(item.efficiency)}</td>
      </tr>
    `;
  }).join('');

  if (totalMetric) {
    totalMetric.textContent = formatCurrency(totalSavings);
    totalMetric.style.color = totalSavings >= 0 ? '#10b981' : '#f87171';
  }
}

// NEW: Negotiation Script Generator
function generateNegotiationScript(value, oldTerm, newTerm, economy, pct) {
  const scriptEl = document.getElementById('negotiation-script');
  if (economy > 0) {
    scriptEl.innerHTML = `"Entendemos o valor da parceria, mas com base no nosso custo de oportunidade atual, este pagamento de <b>${oldTerm} dias</b> pressupõe um desembolso financeiro acelerado. Para mantermos a saúde do fluxo de caixa sem impacto no preço nominal, precisamos estender para <b>${newTerm} dias</b>, o que representa um ajuste de equilíbrio financeiro de <b>${formatPct(pct)}</b>. Caso não seja possível o prazo, precisaríamos de um desconto correspondente de <b>${formatCurrency(economy)}</b> no valor total."`;
  } else {
    scriptEl.textContent = "Defina um prazo maior para gerar argumentos de economia.";
  }
}

// Multi-Scenario Comparison with Deltas
document.getElementById('compare-btn')?.addEventListener('click', () => {
  const rate = parseFloat(document.getElementById('interest-rate').value) / 100;
  
  let scenarios = [
    { v: parseFloat(document.getElementById('comp-v1').value), d: parseFloat(document.getElementById('comp-d1').value), el: 'comp-res-pv1' },
    { v: parseFloat(document.getElementById('comp-v2').value), d: parseFloat(document.getElementById('comp-d2').value), el: 'comp-res-pv2' },
    { v: parseFloat(document.getElementById('comp-v3').value), d: parseFloat(document.getElementById('comp-d3').value), el: 'comp-res-pv3' }
  ];

  let bestIndex = 0;
  let minPV = Infinity;
  let basePV = scenarios[0].v / Math.pow((1 + rate), scenarios[0].d / 30);

  scenarios.forEach((s, i) => {
    const pv = s.v / Math.pow((1 + rate), s.d / 30);
    document.getElementById(s.el).textContent = formatCurrency(pv);
    
    // NEW: Gross Value Display in Results
    const brutoEl = document.getElementById(`comp-bruto-v${i+1}`);
    if (brutoEl) brutoEl.textContent = formatCurrency(s.v);

    if (i > 0) {

      const diff = basePV - pv;
      const pct = (basePV === 0) ? 0 : (diff / basePV) * 100;
      
      const diffV = document.getElementById(`comp-diff-v${i+1}`);
      const diffP = document.getElementById(`comp-diff-p${i+1}`);
      
      diffV.textContent = formatCurrency(diff);
      diffP.textContent = formatPct(pct);
      
      diffV.style.color = diff >= 0 ? '#10b981' : '#f87171';
      diffP.style.color = diff >= 0 ? '#10b981' : '#f87171';
    }

    if (pv < minPV) {
      minPV = pv;
      bestIndex = i;
    }
  });

  document.querySelectorAll('.scenario-card').forEach((c, i) => {
    c.classList.toggle('active', i === bestIndex);
  });

  const banner = document.getElementById('best-option-banner');
  banner.style.display = 'block';
  document.getElementById('best-option-desc').textContent = `A Proposta ${String.fromCharCode(65 + bestIndex)} possui o menor custo financeiro real (${formatCurrency(minPV)}).`;
  
  // PERSISTENCE: Save BEST scenario for "Analise Visual"
  const best = scenarios[bestIndex];
  localStorage.setItem('last_calculation', JSON.stringify({
    fv: best.v,
    d1: scenarios[0].d, // Base days
    d2: best.d,
    rate: rate
  }));

  lucide.createIcons();
});


// Manual Save Button - Calculator
document.getElementById('save-calc-btn')?.addEventListener('click', () => {
    const value = parseFloat(document.getElementById('purchase-value').value);
    const d1 = document.getElementById('current-term').value;
    const d2 = document.getElementById('new-term').value;
    const pvOld = value / Math.pow((1 + parseFloat(document.getElementById('interest-rate').value)/100), d1/30);
    const pvNew = value / Math.pow((1 + parseFloat(document.getElementById('interest-rate').value)/100), d2/30);
    const diff = pvOld - pvNew;

    saveToHistory({
        date: new Date().toLocaleString('pt-BR'),
        value: value,
        terms: `${d1}d / ${d2}d`,
        economy: diff,
        efficiency: (diff / pvOld) * 100
    });
    alert("Simulação de prazos salva no histórico!");
});

// Manual Save Button - Comparison
document.getElementById('save-comp-btn')?.addEventListener('click', () => {
    const rate = parseFloat(document.getElementById('interest-rate').value) / 100;
    const v1 = parseFloat(document.getElementById('comp-v1').value);
    const d1 = parseFloat(document.getElementById('comp-d1').value);
    const pv1 = v1 / Math.pow((1 + rate), d1 / 30);

    // Save the active (best) scenario vs base
    const activeCard = document.querySelector('.scenario-card.active');
    const idx = Array.from(document.querySelectorAll('.scenario-card')).indexOf(activeCard);
    
    let v, d;
    if (idx === 0) { v = v1; d = d1; }
    else if (idx === 1) { v = parseFloat(document.getElementById('comp-v2').value); d = parseFloat(document.getElementById('comp-d2').value); }
    else { v = parseFloat(document.getElementById('comp-v3').value); d = parseFloat(document.getElementById('comp-d3').value); }

    const pvActive = v / Math.pow((1 + rate), d / 30);
    const diff = pv1 - pvActive;

    saveToHistory({
        date: new Date().toLocaleString('pt-BR'),
        value: v,
        terms: `Comp: ${d1}d / ${d}d`,
        economy: diff,
        efficiency: (pv1 === 0) ? 0 : (diff / pv1) * 100
    });
    alert(`Comparativo salvo com base na Proposta ${String.fromCharCode(65 + idx)}!`);
});


// Copy Script to Clipboard
document.getElementById('copy-script-btn')?.addEventListener('click', () => {
  const text = document.getElementById('negotiation-script')?.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-script-btn');
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = "COPIADO!";
    setTimeout(() => btn.textContent = originalText, 2000);
  });
});

// Installments Logic
document.getElementById('inst-calculate-btn')?.addEventListener('click', calculateInstallments);


// Clear History Logic
function clearAllHistory() {
  if (confirm("Tem certeza que deseja apagar todo o histórico de simulações? Esta ação não pode ser desfeita.")) {
    localStorage.removeItem('sourcing_history');
    renderHistory();
    alert("Histórico removido com sucesso!");
  }
}

document.getElementById('clear-history-btn')?.addEventListener('click', clearAllHistory);
document.getElementById('clear-history-btn-footer')?.addEventListener('click', clearAllHistory);

// PDF Export from Settings/History
const handlePrint = () => {
  const btn = document.getElementById('export-report-pdf-btn');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> GERANDO PDF...';
  btn.style.opacity = '0.6';
  btn.style.pointerEvents = 'none';
  lucide.createIcons();

  prepareAndPrintReport().then(() => {
    btn.innerHTML = originalHtml;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    lucide.createIcons();
  }).catch(err => {
    console.error("Erro PDF:", err);
    alert("Houve um erro ao gerar o PDF. Verifique se o navegador não está bloqueando o download.");
    btn.innerHTML = originalHtml;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    lucide.createIcons();
  });
};

document.getElementById('export-report-pdf-btn')?.addEventListener('click', handlePrint);
document.getElementById('print-report-btn')?.addEventListener('click', handlePrint);

async function prepareAndPrintReport() {
  // 1. Set Date
  const now = new Date();
  document.getElementById('report-date').textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

  // 2. Sync Current Results (from main calculator)
  document.getElementById('report-economy').textContent = document.getElementById('res-diff').textContent;
  document.getElementById('report-efficiency').textContent = document.getElementById('res-gain-pct').textContent;
  
  // NEW: Sync Context Data
  const valInput = document.getElementById('purchase-value');
  const val = parseFloat(valInput.value || 0);
  document.getElementById('report-nominal').textContent = formatCurrency(val);
  
  const d1 = document.getElementById('current-term').value;
  const d2 = document.getElementById('new-term').value;
  document.getElementById('report-term-current').textContent = d1 + ' dias';
  document.getElementById('report-term-new').textContent = d2 + ' dias';
  document.getElementById('report-term-gain').textContent = '+' + (d2 - d1) + ' dias';

  // 3. Sync Insights
  document.getElementById('report-summary-text').innerHTML = document.getElementById('summary-text').innerHTML;
  document.getElementById('report-sourcing-text').innerHTML = document.getElementById('sourcing-text').innerHTML;
  document.getElementById('report-negotiation-script').innerHTML = document.getElementById('negotiation-script').innerHTML;

  // 4. Populate the hidden report view and capture
  const element = document.getElementById('report-view');
  element.style.display = 'block'; // Make visible for capture

  const opt = {
    margin: [10, 10, 10, 10],
    filename: 'Relatorio_Negociacao_SourcingPro.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, logging: false, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
     await html2pdf().set(opt).from(element).save();
  } finally {
     element.style.display = 'none';
  }
}

function calculateInstallments() {
  const totalValue = parseFloat(document.getElementById('inst-value').value);
  const count = parseInt(document.getElementById('inst-count').value);
  const monthlyRate = parseFloat(document.getElementById('inst-rate').value) / 100;
  const delayDays = parseInt(document.getElementById('inst-delay').value);

  if (isNaN(totalValue) || isNaN(count) || count <= 0) {
    alert("Dados inválidos para parcelamento.");
    return;
  }

  const pmt = totalValue / count;
  let pvTotal = 0;
  const startMonth = delayDays / 30;
  
  let scheduleHtml = '';

  for (let k = 1; k <= count; k++) {
    const n = startMonth + (k - 1);
    const instDays = Math.round(n * 30);
    const instPV = pmt / Math.pow((1 + monthlyRate), n);
    pvTotal += instPV;

    scheduleHtml += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 0.75rem 0.5rem; font-weight: 600;">${k}ª Parcela</td>
        <td style="padding: 0.75rem 0.5rem; color: var(--text-muted);">${instDays} dias</td>
        <td style="padding: 0.75rem 0.5rem;">${formatCurrency(pmt)}</td>
        <td style="padding: 0.75rem 0.5rem; color: var(--accent-green); font-weight: 500;">${formatCurrency(instPV)}</td>
      </tr>
    `;
  }

  const diff = totalValue - pvTotal;
  
  // Show table and populate
  document.getElementById('inst-schedule-container').style.display = 'block';
  document.getElementById('inst-schedule-body').innerHTML = scheduleHtml;

  document.getElementById('res-inst-pmt').textContent = formatCurrency(pmt);
  document.getElementById('res-inst-pv-total').textContent = formatCurrency(pvTotal);
  document.getElementById('res-inst-nominal').textContent = formatCurrency(totalValue);
  document.getElementById('res-inst-diff').textContent = formatCurrency(diff);


  const summary = document.getElementById('inst-summary-text');
  summary.innerHTML = `Nesta simulação de <b>${count} parcelas</b>, o valor presente da série é <b>${formatCurrency(pvTotal)}</b>. 
  <br><br>Isso significa que, financeiramente, você está economizando <b>${formatCurrency(diff)}</b> em comparação a um pagamento total à vista hoje, devido ao valor do dinheiro no tempo. 
  <br><br><b>Conselho de Sourcing:</b> O parcelamento é uma excelente ferramenta para preservar o capital de giro, permitindo que a empresa utilize o caixa em outras áreas enquanto liquida a obrigação gradualmente.`;
}
// Chart Instances

function updateCharts(fv, d1, d2, rate) {
  const pv1 = fv / Math.pow((1 + rate), d1 / 30);
  const pv2 = fv / Math.pow((1 + rate), d2 / 30);
  const economy = pv1 - pv2;

  const chartTheme = {
    textColor: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    primary: '#38bdf8',
    secondary: '#ec4899',
    accent: '#0ea5e9'
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom', 
        labels: { 
          color: chartTheme.textColor, 
          boxWidth: 8,
          font: { size: 9 } 
        } 
      } 
    },
    scales: {
      y: { border: { display: false }, grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.textColor, font: { size: 9 } } },
      x: { border: { display: false }, grid: { display: false }, ticks: { color: chartTheme.textColor, font: { size: 9 } } }
    }
  };

  // 1. Comparison Bar Chart
  const ctx1 = document.getElementById('pvComparisonChart').getContext('2d');
  if (pvChart) pvChart.destroy();
  pvChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Prazo Atual', 'Novo Prazo'],
      datasets: [{
        label: 'Valor Presente (R$)',
        data: [pv1.toFixed(2), pv2.toFixed(2)],
        backgroundColor: [chartTheme.accent, chartTheme.primary],
        borderRadius: 8
      }]
    },
    options: { ...commonOptions, plugins: { legend: { display: false } } }
  });

  // 2. Economy Pie Chart
  const ctx2 = document.getElementById('economyPieChart').getContext('2d');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['VP Final', 'Economia'],
      datasets: [{
        data: [pv2.toFixed(2), economy.toFixed(2)],
        backgroundColor: ['rgba(255, 255, 255, 0.05)', chartTheme.primary],
        borderWidth: 0,
        innerRadius: '75%',
        hoverOffset: 4
      }]
    },
    options: { ...commonOptions, plugins: { legend: { display: true, position: 'bottom', labels: { color: chartTheme.textColor, boxWidth: 8, font: { size: 9 } } } }, scales: { x: { display: false }, y: { display: false } } }
  });

  // 3. Sensitivity Chart
  const scenarios = [0, 30, 60, 90, 120, 150];
  const scenarioData = scenarios.map(d => (fv / Math.pow((1 + rate), d / 30)).toFixed(2));
  
  const ctx3 = document.getElementById('sensitivityChart').getContext('2d');
  if (sensChart) sensChart.destroy();
  sensChart = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: scenarios.map(d => `${d}d`),
      datasets: [{
        label: 'VP',
        data: scenarioData,
        borderColor: chartTheme.primary,
        borderWidth: 2,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: chartTheme.primary
      }]
    },
    options: { ...commonOptions, plugins: { legend: { display: false } } }
  });
}
