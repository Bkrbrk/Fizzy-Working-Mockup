document.addEventListener("DOMContentLoaded", () => {
  // ===== Elements =====
  const asOf = document.getElementById("asOf");
  const refreshBtn = document.getElementById("refreshBtn");
  const clearBtn = document.getElementById("clearBtn");
  const usersTbody = document.getElementById("usersTbody");
  const selectedUserPill = document.getElementById("selectedUserPill");
  const leaderboardLoading = document.getElementById("leaderboardLoading");
  const detailLoading = document.getElementById("detailLoading");
  const searchInput = document.querySelector(".search");
  const usersCount = document.getElementById("usersCount");


function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }

  // ===== State =====
  let selectedUserId = null;
  let allUsers = [];

  // ===== Date default =====
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  asOf.value = `${yyyy}-${mm}-${dd}`;

  // ===== Tabs =====
  const rightTitle = document.getElementById("rightTitle");
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tabpage").forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const id = "tab-" + btn.dataset.tab;
      document.getElementById(id).classList.add("active");

      rightTitle.textContent = btn.dataset.tab === "overview" ? "Genel Bakış" : "Liderlik Tablosu";
    });
  });

  // ===== Mock data sources (later swap to fetch) =====
  async function apiGet(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function getUsers(){
  
  return apiGet("/api/users");
}

async function getUserDetail(userId){
  const raw = await apiGet(`/api/user/${encodeURIComponent(userId)}`);
  const s = raw.state || {};

  return {
    state: {
      today: {
        listen_minutes_today: s.listen_minutes_today ?? 0,
        unique_tracks_today: s.unique_tracks_today ?? 0,
        playlist_additions_today: s.playlist_additions_today ?? 0,
        shares_today: s.shares_today ?? 0,
      },
      d7: {
        listen_minutes_7d: s.listen_minutes_7d ?? 0,
        unique_tracks_7d: s.unique_tracks_7d ?? 0,
        shares_7d: s.shares_7d ?? 0,
      },
      streak: s.listen_streak_days ?? s.streak ?? 0,
    },
    challenges: {
      triggered: (raw.awards || []).flatMap(a => a.triggered_challenges || []),
      selected: (raw.awards || [])[0]?.selected_challenge || "-",
      suppressed: (raw.awards || []).flatMap(a => a.suppressed_challenges || []),
    },
    badges: (raw.badges || []).map(b => b.badge_id || b.badge || String(b)),
    notifications: (raw.notifs || []).map(n => ({
      message: n.message,
      sent_at: (n.sent_at || "").toString().slice(0,10),
      channel: n.channel || "BiP",
    })),
  };
}


async function getLeaderboard(asOfDate){
  return apiGet("/api/leaderboard");
}

  // ===== Render =====
 function renderUsers(users) {
  usersTbody.innerHTML = "";

  users.forEach((user) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <button class="row-btn" data-id="${user.user_id}">
          <span class="user-pill">
            <span class="user-avatar">
              ${user.user_id.charAt(0).toUpperCase()}
            </span>
            ${user.user_id}
          </span>
        </button>
      </td>
      <td><span class="points">${user.total_points}</span></td>
    `;

    usersTbody.appendChild(tr);
  });


    // click handler
    document.querySelectorAll(".row-btn").forEach((btn) => {
     btn.addEventListener("click", async () => {

  document.querySelectorAll("#usersTbody tr")
    .forEach(tr => tr.classList.remove("active"));

  btn.closest("tr").classList.add("active");

  selectedUserId = btn.dataset.id;

  selectedUserPill.innerHTML =
    `<span class="dot accent"></span> ${selectedUserId}`;

  const panelBody = document.querySelector(".main .panel-body");
  panelBody.classList.add("loading");

  show(detailLoading);

  const detail = await getUserDetail(selectedUserId);
  renderUserDetail(detail);

  hide(detailLoading);
  panelBody.classList.remove("loading");

});
    });
  }

  

  function renderUserDetail(data) {
    const mainPanel = document.querySelector(".main .panel");
mainPanel.classList.remove("fade-in");
void mainPanel.offsetWidth; // reflow: animasyonu yeniden başlatır
mainPanel.classList.add("fade-in");

    // STATS
    document.getElementById("statToday").textContent = `${data.state.today.listen_minutes_today} dk`;
    document.getElementById("stat7d").textContent = `${data.state.d7.listen_minutes_7d} dk`;
    document.getElementById("statStreak").textContent = `${data.state.streak} gün`;
// STREAK PROGRESS
const streakProgress = document.getElementById("streakProgress");
const streakBar = document.getElementById("streakBar");

const pct = Math.min(100, (data.state.streak || 0) * 20);

streakProgress.classList.remove("hidden");
streakBar.style.width = pct + "%";
document.getElementById("streakFlame").classList.remove("hidden");


    // CHALLENGES
    document.getElementById("triggeredBox").textContent = (data.challenges.triggered || []).join(", ") || "-";
    document.getElementById("selectedBox").textContent = data.challenges.selected || "-";
    document.getElementById("suppressedBox").textContent = (data.challenges.suppressed || []).join(", ") || "-";

    // BADGES
    const badgeRow = document.getElementById("badgesRow");
    badgeRow.innerHTML = "";
    (data.badges || []).forEach((b) => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = b;
      badgeRow.appendChild(span);
    });
    if (!data.badges || data.badges.length === 0) badgeRow.innerHTML = `<span class="badge">-</span>`;

    // NOTIFICATIONS
    const notifList = document.getElementById("notifList");
    notifList.innerHTML = "";
    (data.notifications || []).forEach((n) => {
      notifList.innerHTML += `
        <div class="item">
          <div>${n.message}</div>
          <div class="meta">
            <span class="pill">${n.channel}</span>
            <span>${n.sent_at}</span>
          </div>
        </div>
      `;
    });
    if (!data.notifications || data.notifications.length === 0) {
      notifList.innerHTML = `
        <div class="item">
          <div>Bildirim bulunmuyor</div>
          <div class="meta">
            <span class="pill">-</span>
            <span>-</span>
          </div>
        </div>
      `;
    }
    // animasyonu zorla (her seçimde tekrar oynasın)
const dc = document.getElementById("detailContent");
dc.classList.remove("reveal");
void dc.offsetWidth; // reflow
dc.classList.add("reveal");

  }

 function renderLeaderboard(data) {
  const lbTbody = document.getElementById("lbTbody");
  lbTbody.innerHTML = "";

  data.forEach(row => {

    let medal = "";
    if (row.rank === 1) medal = "🥇";
    else if (row.rank === 2) medal = "🥈";
    else if (row.rank === 3) medal = "🥉";

    const tr = document.createElement("tr");
    tr.className = "lb-row";
    tr.dataset.id = row.user_id;

    tr.innerHTML = `
      <td>
        ${row.rank <= 3
          ? `<span class="medal m${row.rank}">${medal}</span>`
          : `<span class="rank">${row.rank}</span>`
        }
      </td>
      <td>${row.user_id}</td>
      <td>${row.total_points}</td>
    `;

    lbTbody.appendChild(tr);
  });

  bindLeaderboardClicks();
}

function bindLeaderboardClicks(){
  document.querySelectorAll(".lb-row").forEach(tr => {
    tr.addEventListener("click", async () => {

      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelector('[data-tab="overview"]').classList.add("active");

      document.querySelectorAll(".tabpage").forEach(p => p.classList.remove("active"));
      document.getElementById("tab-overview").classList.add("active");

      selectedUserId = tr.dataset.id;

      document.querySelectorAll("#usersTbody tr")
        .forEach(tr => tr.classList.remove("active"));

      const targetRowBtn = document.querySelector(
        `#usersTbody .row-btn[data-id="${selectedUserId}"]`
      );

      if (targetRowBtn) {
        targetRowBtn.closest("tr").classList.add("active");
      }

      selectedUserPill.innerHTML =
        `<span class="dot accent"></span> ${selectedUserId}`;

      const panelBody = document.querySelector(".main .panel-body");
      panelBody.classList.add("loading");

      show(detailLoading);

      const detail = await getUserDetail(selectedUserId);
      renderUserDetail(detail);

      hide(detailLoading);
      panelBody.classList.remove("loading");
    });
  });
}


  // ===== Refresh + Date change =====
 async function refreshAll() {

  show(leaderboardLoading);

  const leaderboard = await getLeaderboard(asOf.value);
  renderLeaderboard(leaderboard);

  hide(leaderboardLoading);

  if (selectedUserId) {
    show(detailLoading);
    const detail = await getUserDetail(selectedUserId);
    renderUserDetail(detail);
    hide(detailLoading);
  }
}


  refreshBtn.addEventListener("click", refreshAll);
  asOf.addEventListener("change", refreshAll);

  // ===== Clear right panel only =====
  clearBtn.addEventListener("click", () => {
    selectedUserId = null;
    document.getElementById("userSearch").value = "";
    usersCount.textContent = `${allUsers.length} Kullanıcı`;
    renderUsers(allUsers);


    document.querySelectorAll("#usersTbody tr").forEach((tr) => tr.classList.remove("active"));

    selectedUserPill.innerHTML = `<span class="dot"></span> Kullanıcı Seçilmedi`;

    document.getElementById("statToday").textContent = "-";
    document.getElementById("stat7d").textContent = "-";
    document.getElementById("statStreak").textContent = "-";
  
document.getElementById("streakProgress").classList.add("hidden");
document.getElementById("streakBar").style.width = "0%";
document.getElementById("streakFlame").classList.add("hidden");


    document.getElementById("triggeredBox").textContent = "-";
    document.getElementById("selectedBox").textContent = "-";
    document.getElementById("suppressedBox").textContent = "-";

    document.getElementById("badgesRow").innerHTML = `<span class="badge">-</span>`;

    document.getElementById("notifList").innerHTML = `
      <div class="item">
        <div>Bildirim bulunmuyor</div>
        <div class="meta">
          <span class="pill">-</span>
          <span>-</span>
        </div>
      </div>
    `;
  });

  searchInput.addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();

  const filtered = allUsers.filter(user =>
    user.user_id.toLowerCase().includes(value)
  );

  renderUsers(filtered);
  usersCount.textContent = `${filtered.length} Kullanıcı`;
});


  // ===== Init =====
  async function init() {
  const users = await getUsers();
  allUsers = users; 
  usersCount.textContent = `${allUsers.length} Kullanıcı`;
  renderUsers(users);

  await refreshAll();
}

init();

});
