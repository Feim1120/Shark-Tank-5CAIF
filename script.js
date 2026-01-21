const INITIAL_CAPITAL = 300000;
const MAX_FUNDING   = 300000;
const MIN_INVEST    = 2000;
const LOCAL_KEY     = 'loggedCompanySharkTank';

const companies = [
  { name: "Prestige Motors", members: ["Feim"], logo: "logos/prestige.png" },
  { name: "IT Solutions", members: ["Berkay"], logo: "logos/itsolutions.png" },
  { name: "Silent Cafe", members: ["Patrik"], logo: "logos/silentcafe.png" },
  { name: "StudieRoom", members: ["Georg"], logo: "logos/studieroom.png" },
  { name: "Mobility Hub", members: ["Ksawa"], logo: "logos/mobilityhub.png" },
  { name: "Fashion Drive", members: ["Wessel"], logo: "logos/fashiondrive.png" },
  { name: "M8erbahn", members: ["Boris"], logo: "logos/m8erbahn.png" },
  { name: "ColorFit", members: ["David", "Benjo"], logo: "logos/colorfit.png" },
  { name: "nutriGo", members: ["Sascha"], logo: "logos/nutrigo.png" },
  { name: "Code4Local", members: ["Djole"], logo: "logos/code4local.png" },
  { name: "Bon Voyage", members: ["Adrian"], logo: "logos/bonvoyage.png" },
  { name: "AssetSecure", members: ["Martin", "Flo"], logo: "logos/assetsecure.png" },
  { name: "GreenBox", members: ["Samy", "Dawid"], logo: "logos/greenbox.png" },
  { name: "HighTech", members: ["Eray"], logo: "logos/hightech.png" }
];

let transactions = [];
let loggedCompany = localStorage.getItem(LOCAL_KEY);
let currentTarget = null;
let investmentsFrozen = false;

document.addEventListener('DOMContentLoaded', () => {

  const companySelect = document.getElementById('company-select');
  companies.forEach(co => {
    const opt = document.createElement('option');
    opt.value = co.name;
    opt.textContent = co.name;
    companySelect.appendChild(opt);
  });

  document.getElementById('login-button').addEventListener('click', () => {
    const company = companySelect.value;
    const pin = document.getElementById('pin-input').value.trim();
    const errorEl = document.getElementById('login-error');

    errorEl.textContent = '';

    if (!company || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      errorEl.textContent = 'Bitte Unternehmen wählen und 4-stelligen PIN eingeben.';
      return;
    }

    const { ref, get } = window.firebaseRefs;
    const db = window.firebaseDB;

    const pinRef = ref(db, `pins/${company}`);

    get(pinRef).then(snapshot => {
      if (snapshot.exists() && snapshot.val() === pin) {
        localStorage.setItem(LOCAL_KEY, company);
        loggedCompany = company;
        showDashboard();
      } else {
        errorEl.textContent = 'Falscher PIN.';
      }
    }).catch(err => {
      errorEl.textContent = 'Verbindungsfehler – versuche es erneut.';
      console.error(err);
    });
  });

  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(LOCAL_KEY);
      location.reload();
    });
  }

  if (loggedCompany) {
    showDashboard();
  }
});

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('logged-company').textContent = loggedCompany;

  const freezeBtn = document.getElementById('freeze-button');
  if (freezeBtn) {
    freezeBtn.style.display = loggedCompany === "Prestige Motors" ? 'inline-block' : 'none';
  }

  const { ref, onValue, set } = window.firebaseRefs;
  const db = window.firebaseDB;

  onValue(ref(db, 'settings/frozen'), snap => {
    investmentsFrozen = snap.val() === true;
    if (freezeBtn && loggedCompany === "Prestige Motors") {
      freezeBtn.textContent = investmentsFrozen ? '▶️ Freigeben' : '⛔ Stoppen';
    }
  });

  if (freezeBtn && loggedCompany === "Prestige Motors") {
    freezeBtn.addEventListener('click', () => {
      set(ref(db, 'settings/frozen'), !investmentsFrozen);
    });
  }

  onValue(ref(db, 'investments'), snapshot => {
    transactions = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        transactions.push(child.val());
      });
    }
    updateAll();
  });
}

function updateAll() {
  renderCompanies();
  renderRanking();
  renderLog();
  renderStats();
}

function getRemaining(name) {
  return INITIAL_CAPITAL - transactions
    .filter(t => t.from === name)
    .reduce((sum, t) => sum + t.amount, 0);
}

function getFunding(name) {
  return transactions
    .filter(t => t.to === name)
    .reduce((sum, t) => sum + t.amount, 0);
}

function getInvested(name) {
  return transactions
    .filter(t => t.from === name)
    .reduce((sum, t) => sum + t.amount, 0);
}

function getMyInvestmentInCompany(target) {
  return transactions
    .filter(t => t.from === loggedCompany && t.to === target)
    .reduce((sum, t) => sum + t.amount, 0);
}

function getTotalMarket() {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

function getMaxPossible() {
  return companies.length * MAX_FUNDING;
}

function isFullyFunded(name) {
  return getFunding(name) >= MAX_FUNDING;
}

function renderCompanies() {
  const grid = document.getElementById('company-grid');
  grid.innerHTML = '';

  companies.forEach(co => {
    const totalFunding = getFunding(co.name);
    const myInvestment = getMyInvestmentInCompany(co.name);
    const myPercent = Math.min(100, (myInvestment / INITIAL_CAPITAL) * 100);
    const fully = isFullyFunded(co.name);
    const isSelf = co.name === loggedCompany;

    let barColor = '#475569';
    if (myPercent >= 70) barColor = '#22c55e';
    else if (myPercent >= 30) barColor = '#3b82f6';

    const card = document.createElement('div');
    card.className = 'company-card';
    if (fully) card.classList.add('fully-funded');

    card.innerHTML = `
      <img src="${co.logo}" alt="${co.name}" class="company-logo">
      <div class="card-body">
        <h3>${co.name}</h3>

        <div class="members">
          👥 ${co.members.join(", ")}
        </div>

        <div class="funding-info">
          <span>Von dir investiert: ${myInvestment.toLocaleString()} €</span>
          <span>${myPercent.toFixed(0)}%</span>
        </div>

        <div class="progress">
          <div class="progress-fill" style="width:${myPercent}%; background:${barColor};"></div>
        </div>

        <button class="invest-button"
                ${fully || isSelf || getRemaining(loggedCompany) < MIN_INVEST ? 'disabled' : ''}>
          💸 Investieren
        </button>
      </div>

      <div class="status">${fully ? '🔴' : '🟢'}</div>
      ${isSelf ? '<div class="self-badge">👤 Das bist du</div>' : ''}
    `;

    const openModal = () => openInvestModal(co.name);

    card.addEventListener('click', e => {
      if (!e.target.closest('button')) openModal();
    });

    card.querySelector('.invest-button')?.addEventListener('click', e => {
      e.stopPropagation();
      openModal();
    });

    grid.appendChild(card);
  });
}

function renderRanking() {
  const ol = document.getElementById('ranking-list');
  ol.innerHTML = '';

  const ranked = [...companies]
    .map(co => ({ ...co, invested: getFunding(co.name) }))  // ← Korrektur: erhaltenes Kapital!
    .sort((a, b) => b.invested - a.invested);

  ranked.forEach((co, i) => {
    const pos = i + 1;
    let medal = pos === 1 ? '🥇 ' : pos === 2 ? '🥈 ' : pos === 3 ? '🥉 ' : '';
    
    const li = document.createElement('li');
    li.innerHTML = `${medal}<strong>${pos}.</strong> ${co.name} – ${co.invested.toLocaleString()} €`;
    
    if (co.members && co.members.length > 1) {
      li.innerHTML += ` <small>(Team: ${co.members.length})</small>`;
    }

    if (co.name === loggedCompany) {
      li.style.background = '#1d4ed8';
      li.style.color = 'white';
      li.style.borderLeftColor = '#60a5fa';
    }
    
    ol.appendChild(li);
  });
}

function renderLog() {
  const ul = document.getElementById('investment-log');
  ul.innerHTML = '';

  [...transactions]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .forEach(t => {
      const time = t.ts ? new Date(t.ts).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '—';
      const li = document.createElement('li');
      li.textContent = `${time} – ${t.from} → ${t.to} : ${t.amount.toLocaleString()} €`;
      ul.appendChild(li);
    });
}

function renderStats() {
  const total = getTotalMarket();
  document.getElementById('total-invested').textContent = total.toLocaleString() + ' €';
  document.getElementById('max-possible').textContent = getMaxPossible().toLocaleString();

  if (loggedCompany) {
    const remaining = getRemaining(loggedCompany);
    document.getElementById('user-remaining').textContent = 
      remaining.toLocaleString() + ' €' + 
      (remaining < MIN_INVEST ? ' (zu wenig zum Investieren)' : '');
  }

  const last = transactions[transactions.length - 1];
  document.getElementById('last-investment-display').textContent = last
    ? `🔥 Letzte Investition: ${last.from} → ${last.to} (${last.amount.toLocaleString()} €)`
    : '🔥 Letzte Investition: —';
}

function openInvestModal(targetName) {
  if (targetName === loggedCompany) return;

  if (investmentsFrozen) {
    alert('⛔ Investments sind aktuell gestoppt.');
    return;
  }

  currentTarget = targetName;
  document.getElementById('modal-target-company').textContent = targetName;
  document.getElementById('modal-investor').textContent = loggedCompany;
  document.getElementById('modal-remaining').textContent = getRemaining(loggedCompany).toLocaleString() + ' €';
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-error').textContent = '';

  document.getElementById('invest-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('invest-modal').style.display = 'none';
  currentTarget = null;
}

function showError(msg) {
  document.getElementById('modal-error').textContent = msg;
}

document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('btn-confirm').addEventListener('click', () => {
  if (investmentsFrozen) {
    return showError('⛔ Investments sind aktuell gesperrt.');
  }

  const from = loggedCompany;
  const amount = Number(document.getElementById('modal-amount').value);
  const errorEl = document.getElementById('modal-error');

  if (isNaN(amount) || amount < MIN_INVEST) return showError(`Mindestens ${MIN_INVEST.toLocaleString()} €`);
  if (amount <= 0) return showError('Betrag muss positiv sein.');

  const remaining = getRemaining(from);
  if (amount > remaining) return showError(`Nur noch ${remaining.toLocaleString()} € verfügbar.`);

  if (from === currentTarget) return showError('Keine Selbst-Investition möglich.');

  const { ref, get, push, serverTimestamp } = window.firebaseRefs;
  const db = window.firebaseDB;

  get(ref(db, 'investments')).then(snapshot => {
    let serverTx = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => serverTx.push(child.val()));
    }
    const currentFunding = serverTx
      .filter(t => t.to === currentTarget)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    if (currentFunding + amount > MAX_FUNDING) {
      return showError(`Firma kann maximal ${MAX_FUNDING.toLocaleString()} € erhalten (aktuell ${currentFunding.toLocaleString()} €).`);
    }

    push(ref(db, 'investments'), {
      from,
      to: currentTarget,
      amount,
      ts: serverTimestamp()
    })
    .then(() => closeModal())
    .catch(err => {
      showError('Fehler beim Speichern der Investition.');
      console.error(err);
    });
  }).catch(err => {
    showError('Fehler beim Prüfen der aktuellen Daten.');
    console.error(err);
  });
});

document.getElementById('invest-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('invest-modal')) closeModal();
});