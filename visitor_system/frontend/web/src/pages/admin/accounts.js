(function registerAdminAccountsPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }

  const pageRegistry = runtime.getRegistry("adminPages");
  const behaviorRegistry = runtime.getRegistry("adminBehaviors");

  const ROLE_LABELS = {
    madao: "总指挥官",
    madao1: "全局运营",
    madao2: "审批主管",
    madao3: "现场签到",
    madao4: "审计查看",
  };
  const ROLE_HINTS = {
    madao: "可管理所有管理员账号，并拥有全部后台能力。",
    madao1: "可使用所有业务模块，但不能管理管理员账号。",
    madao2: "负责审批、待审列表和历史跟踪。",
    madao3: "负责现场核验与签到。",
    madao4: "负责看板、历史和日志查看。",
  };

  pageRegistry.accounts = function initAdminAccountsPage(context) {
    return {
      key: "accounts",
      sectionId: "auth-section",
      refreshButtonIds: ["refresh-account-button", "refresh-users-button"],
      mount() {
        const section = context.byId("auth-section");
        if (section) {
          section.dataset.module = "accounts";
        }
        return section || null;
      },
    };
  };

  behaviorRegistry.accounts = function createAdminAccountsBehavior(context) {
    const { el, deps, state, services } = context;
    const { adminSession, visitorApi } = services;
    const sessionState = state.session;
    const onsiteState = state.onsite;

    function roleLabel(role) {
      return ROLE_LABELS[role] || role || "-";
    }

    function roleHint(role) {
      return ROLE_HINTS[role] || "该角色暂无说明。";
    }

    function canManageAdminUsers() {
      return deps.isAdminLoggedIn() && sessionState.getCurrentRole() === "madao" && !sessionState.getNeedsPasswordChange();
    }

    function syncManagementPanel() {
      const visible = canManageAdminUsers();
      deps.toggleHidden(el.userManagementPanel, !visible);
      deps.toggleHidden(el.editUserPanel, !visible || !el.editUserIdInput?.value);

      if (!el.userManagementTipNode) {
        return;
      }

      if (visible) {
        deps.setText(el.userManagementTipNode, "当前为总指挥官 madao，可新增、编辑、删除管理员账号。");
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.userManagementTipNode, "登录后可查看账号管理能力。");
        return;
      }

      deps.setText(el.userManagementTipNode, "管理员账号的增删改和权限调整仅开放给总指挥官 madao。");
    }

    function syncAdminAuthHint() {
      if (!el.adminAuthTipNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.adminAuthTipNode, "请先登录后再加载后台数据。");
        return;
      }

      if (sessionState.getNeedsPasswordChange()) {
        deps.setText(el.adminAuthTipNode, "当前账号需要先完成密码修改，其他后台能力暂时锁定。");
        return;
      }

      if (sessionState.getCurrentRole() === "madao") {
        deps.setText(el.adminAuthTipNode, "当前为总指挥官，可查看全后台并维护管理员账号。");
        return;
      }

      deps.setText(el.adminAuthTipNode, `当前角色为 ${roleLabel(sessionState.getCurrentRole())}，可查看个人账户并按权限使用后台。`);
    }

    function adminFeaturesLockedMessage() {
      return "请先完成当前账号密码修改，再继续使用后台功能。";
    }

    function resetCreateUserForm() {
      el.createUserForm?.reset();
      if (el.createUserForm?.elements?.namedItem("new_user_role")) {
        el.createUserForm.elements.namedItem("new_user_role").value = "madao4";
      }
      if (el.createUserForm?.elements?.namedItem("new_user_active")) {
        el.createUserForm.elements.namedItem("new_user_active").value = "true";
      }
      if (el.createUserForm?.elements?.namedItem("new_user_force_password_change")) {
        el.createUserForm.elements.namedItem("new_user_force_password_change").value = "false";
      }
    }

    function resetEditUserForm(message = "选择一条管理员账号后可编辑。") {
      if (el.editUserForm) {
        el.editUserForm.reset();
      }
      if (el.editUserIdInput) {
        el.editUserIdInput.value = "";
      }
      deps.setText(el.editUserStatusNode, message);
      deps.setText(el.editUserResultNode, "尚未提交账号修改。");
      deps.toggleHidden(el.editUserPanel, true);
    }

    function buildAdminUserItem(user) {
      const wrapper = document.createElement("article");
      wrapper.className = "pending-item account-user-card";
      wrapper.dataset.role = user.role || "";
      wrapper.dataset.active = String(Boolean(user.is_active));
      wrapper.dataset.passwordPolicy = user.force_password_change ? "forced" : "normal";

      const isCurrentUser = user.username === sessionState.getCurrentUsername();
      wrapper.classList.toggle("is-current-user", isCurrentUser);
      const stateText = user.is_active ? "已启用" : "已禁用";
      const forceChangeText = user.force_password_change ? "下次登录需改密" : "无需强制改密";

      wrapper.innerHTML = [
        `<h3>${user.username}</h3>`,
        '<div class="pending-meta">',
        `<p><strong>角色：</strong>${roleLabel(user.role)} (${user.role})</p>`,
        `<p><strong>权限说明：</strong>${roleHint(user.role)}</p>`,
        `<p><strong>账号状态：</strong>${stateText}</p>`,
        `<p><strong>密码策略：</strong>${forceChangeText}</p>`,
        `<p><strong>创建时间：</strong>${deps.formatDateTime(user.created_at)}</p>`,
        isCurrentUser ? "<p><strong>说明：</strong>当前登录账号不能在此面板中直接编辑或删除。</p>" : "",
        "</div>",
      ].join("");

      if (canManageAdminUsers()) {
        const actionBar = document.createElement("div");
        actionBar.className = "actions admin-user-actions account-user-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "ghost";
        editButton.textContent = "编辑";
        editButton.disabled = isCurrentUser;
        editButton.addEventListener("click", () => startEditUser(user));

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "ghost";
        toggleButton.textContent = user.is_active ? "禁用" : "启用";
        toggleButton.disabled = isCurrentUser;
        toggleButton.addEventListener("click", async () => {
          await handleAdminUserStatusToggle(user.id, !user.is_active);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = "删除";
        deleteButton.disabled = isCurrentUser;
        deleteButton.addEventListener("click", async () => {
          await handleDeleteAdminUser(user);
        });

        actionBar.append(editButton, toggleButton, deleteButton);
        wrapper.appendChild(actionBar);
      }

      return wrapper;
    }

    function startEditUser(user) {
      if (!canManageAdminUsers() || !el.editUserForm) {
        return;
      }

      el.editUserIdInput.value = String(user.id);
      el.editUserForm.elements.namedItem("edit_username").value = user.username || "";
      el.editUserForm.elements.namedItem("edit_password").value = "";
      el.editUserForm.elements.namedItem("edit_role").value = user.role || "madao4";
      el.editUserForm.elements.namedItem("edit_user_active").value = user.is_active ? "true" : "false";
      el.editUserForm.elements.namedItem("edit_user_force_password_change").value = user.force_password_change ? "true" : "false";
      deps.setText(el.editUserStatusNode, `正在编辑 ${user.username}，可调整角色、状态和密码。`);
      deps.setText(el.editUserResultNode, "修改后点击保存即可生效。");
      deps.toggleHidden(el.editUserPanel, false);
      el.editUserPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function loadCurrentAccount() {
      if (!el.accountResultNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        sessionState.reset();
        deps.toggleHidden(el.accountCard, true);
        deps.setText(el.accountResultNode, "未登录，无法加载管理员账户信息。");
        deps.setText(el.passwordResultNode, "建议首次登录后立即修改默认密码。");
        syncManagementPanel();
        syncAdminAuthHint();
        return;
      }

      deps.toggleHidden(el.accountCard, false);
      deps.setText(el.accountResultNode, "正在加载当前管理员账户信息...");

      try {
        const account = await visitorApi.getCurrentAdmin();
        const forcePasswordChange = Boolean(account.force_password_change);

        sessionState.setNeedsPasswordChange(forcePasswordChange);
        sessionState.setCurrentRole(account.role || "");
        sessionState.setCurrentUsername(account.username || "");
        sessionState.setCurrentAvatar(account.avatar_image || "");
        deps.syncAdminShell?.({ instant: true });

        deps.setText(el.accountUsernameNode, account.username || "-");
        deps.setText(
          el.accountStatusNode,
          `${account.is_active ? "已启用" : "已禁用"} / ${roleLabel(account.role)} (${account.role || "-"})`,
        );
        deps.setText(el.accountCreatedAtNode, deps.formatDateTime(account.created_at));
        deps.setText(
          el.accountResultNode,
          forcePasswordChange ? "当前账号必须先修改密码，修改完成后才能继续访问其他后台模块。" : "当前管理员账户信息已更新。",
        );
        syncManagementPanel();
        syncAdminAuthHint();
      } catch (error) {
        if (deps.isAuthExpiredError?.(error)) {
          return;
        }

        sessionState.reset();
        deps.syncAdminShell?.({ instant: true });
        deps.setText(el.accountResultNode, `账户信息加载失败：${error.message}`);
        syncManagementPanel();
        syncAdminAuthHint();
      }
    }

    async function loadAdminUsers() {
      if (!el.usersResultNode || !el.usersListNode) {
        return;
      }

      deps.clearNode(el.usersListNode);
      deps.toggleHidden(el.usersEmptyNode, true);
      syncManagementPanel();

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.usersResultNode, "未登录，无法加载管理员账户列表。");
        deps.setText(el.createUserResultNode, "登录后可使用管理员账号管理功能。");
        resetEditUserForm();
        return;
      }

      if (sessionState.getNeedsPasswordChange()) {
        deps.setText(el.usersResultNode, adminFeaturesLockedMessage());
        deps.setText(el.createUserResultNode, adminFeaturesLockedMessage());
        resetEditUserForm(adminFeaturesLockedMessage());
        return;
      }

      if (!canManageAdminUsers()) {
        deps.setText(el.usersResultNode, "当前角色只能查看个人账户与修改密码，管理员账号由 madao 统一维护。");
        deps.setText(el.createUserResultNode, "仅总指挥官 madao 可新增、编辑、删除管理员账号。");
        resetEditUserForm("仅总指挥官 madao 可编辑管理员账号。");
        return;
      }

      deps.setText(el.usersResultNode, "正在加载管理员账户列表...");
      deps.setText(el.createUserResultNode, "可在此创建新的管理员账号。");

      try {
        const users = await visitorApi.getAdminUsers();
        deps.clearNode(el.usersListNode);
        deps.toggleHidden(el.usersEmptyNode, users.length !== 0);
        users.forEach((user) => el.usersListNode.appendChild(buildAdminUserItem(user)));
        deps.setText(
          el.usersResultNode,
          users.length ? `已加载 ${users.length} 个管理员账号。` : "当前没有可展示的管理员账号。",
        );
      } catch (error) {
        deps.setText(el.usersResultNode, `管理员账户列表加载失败：${error.message}`);
      }
    }

    async function handleCreateAdminUser(event) {
      event.preventDefault();

      if (!canManageAdminUsers()) {
        deps.setText(el.createUserResultNode, "当前会话无权创建管理员账号。");
        return;
      }

      const formData = new FormData(el.createUserForm);
      const payload = {
        username: formData.get("new_username"),
        password: formData.get("new_user_password"),
        role: formData.get("new_user_role"),
        is_active: formData.get("new_user_active") === "true",
        force_password_change: formData.get("new_user_force_password_change") === "true",
      };

      deps.setText(el.createUserResultNode, "正在创建管理员账号...");

      try {
        const user = await visitorApi.createAdminUser(payload);
        resetCreateUserForm();
        await loadAdminUsers();
        deps.setText(el.createUserResultNode, `管理员账号已创建：${user.username}`);
      } catch (error) {
        deps.setText(el.createUserResultNode, `新增管理员失败：${error.message}`);
      }
    }

    async function handleEditAdminUser(event) {
      event.preventDefault();

      if (!canManageAdminUsers()) {
        deps.setText(el.editUserResultNode, "当前会话无权修改管理员账号。");
        return;
      }

      const userId = Number(el.editUserIdInput?.value || 0);
      if (!userId) {
        deps.setText(el.editUserResultNode, "请先选择一条管理员账号。");
        return;
      }

      const formData = new FormData(el.editUserForm);
      const payload = {
        username: formData.get("edit_username"),
        role: formData.get("edit_role"),
        is_active: formData.get("edit_user_active") === "true",
        force_password_change: formData.get("edit_user_force_password_change") === "true",
      };
      const nextPassword = String(formData.get("edit_password") || "").trim();
      if (nextPassword) {
        payload.password = nextPassword;
      }

      deps.setText(el.editUserResultNode, "正在保存管理员账号修改...");

      try {
        const user = await visitorApi.updateAdminUser(userId, payload);
        deps.setText(el.editUserResultNode, `管理员账号已更新：${user.username}`);
        resetEditUserForm("修改已保存，可继续选择其他账号编辑。");
        await loadAdminUsers();
      } catch (error) {
        deps.setText(el.editUserResultNode, `管理员账号修改失败：${error.message}`);
      }
    }

    function handleCancelUserEdit() {
      resetEditUserForm();
    }

    async function handleAdminUserStatusToggle(userId, isActive) {
      if (!canManageAdminUsers()) {
        deps.setText(el.usersResultNode, "当前会话无权修改管理员账号状态。");
        return;
      }

      deps.setText(el.usersResultNode, isActive ? "正在启用管理员账号..." : "正在禁用管理员账号...");

      try {
        await visitorApi.updateAdminUserStatus(userId, { is_active: isActive });
        if (Number(el.editUserIdInput?.value || 0) === Number(userId)) {
          resetEditUserForm("账号状态已更新，请重新选择需要编辑的账号。");
        }
        await loadAdminUsers();
      } catch (error) {
        deps.setText(el.usersResultNode, `账号状态更新失败：${error.message}`);
      }
    }

    async function handleDeleteAdminUser(user) {
      if (!canManageAdminUsers()) {
        deps.setText(el.usersResultNode, "当前会话无权删除管理员账号。");
        return;
      }

      const confirmed = global.confirm(`确认删除管理员账号 ${user.username} 吗？删除后不能恢复。`);
      if (!confirmed) {
        return;
      }

      deps.setText(el.usersResultNode, `正在删除管理员账号：${user.username} ...`);

      try {
        const result = await visitorApi.deleteAdminUser(user.id);
        if (Number(el.editUserIdInput?.value || 0) === Number(user.id)) {
          resetEditUserForm("已删除当前正在编辑的账号。");
        }
        await loadAdminUsers();
        deps.setText(el.usersResultNode, result.message || `管理员账号已删除：${user.username}`);
      } catch (error) {
        deps.setText(el.usersResultNode, `删除管理员账号失败：${error.message}`);
      }
    }

    async function handlePasswordSubmit(event) {
      event.preventDefault();

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.passwordResultNode, "请先登录管理员账号。");
        return;
      }

      const formData = new FormData(el.passwordForm);
      const payload = {
        current_password: formData.get("current_password"),
        new_password: formData.get("new_password"),
      };

      deps.setText(el.passwordResultNode, "正在更新管理员密码...");

      try {
        const result = await visitorApi.changePassword(payload);
        deps.setText(el.passwordResultNode, result.message || "密码已更新。");
        el.passwordForm.reset();
        await loadCurrentAccount();
        await loadAdminUsers();
        if (!sessionState.getNeedsPasswordChange()) {
          await deps.refreshAdminData();
        }
      } catch (error) {
        deps.setText(el.passwordResultNode, `密码修改失败：${error.message}`);
      }
    }

    function handleLogout(message = "已退出管理员登录。", options = {}) {
      const nextTarget = options.nextTarget || `${global.location.pathname}${global.location.hash || ""}`;

      adminSession.clearToken();
      deps.clearAdminViews({ skipSync: true });
      deps.stopScanner();
      deps.closeConfirmModal();
      onsiteState.reset();
      sessionState.reset();

      deps.clearValue(deps.getCheckInCodeInput());
      deps.clearValue(deps.getExpireCodeInput());
      deps.clearNode(el.usersListNode);
      deps.toggleHidden(el.usersEmptyNode, true);
      deps.toggleHidden(el.accountCard, true);
      resetCreateUserForm();
      resetEditUserForm();
      syncManagementPanel();

      deps.setText(el.adminResultNode, "管理员会话已结束。");
      deps.setText(el.historyResultNode, "管理员会话已结束。");
      deps.setText(el.logsResultNode, "管理员会话已结束。");
      deps.setText(el.statsResultNode, "请先登录后再查看统计数据。");
      deps.setText(el.overviewResultNode, "请先登录后再查看今日看板。");
      deps.setText(el.operationResultNode, "尚未执行现场操作。");
      deps.setText(el.accountResultNode, "登录后可查看当前管理员账户信息。");
      deps.setText(el.passwordResultNode, "建议首次登录后立即修改默认密码。");
      deps.setText(el.usersResultNode, "登录后可查看管理员账户状态。");
      deps.setText(el.createUserResultNode, "登录后可使用管理员账号管理功能。");
      deps.setText(el.expireStaleResultNode, "尚未执行维护操作。");
      deps.setScannerMessage("尚未开始扫码。");
      el.passwordForm?.reset();

      syncAdminAuthHint();
      deps.redirectToAdminLogin?.(message, { nextTarget, replace: true });
    }

    function handleSessionExpired(message = "登录已失效，请重新登录。") {
      handleLogout(message, {
        nextTarget: `${global.location.pathname}${global.location.hash || ""}`,
      });
    }

    resetCreateUserForm();
    resetEditUserForm();
    syncManagementPanel();

    return {
      syncAdminAuthHint,
      adminFeaturesLockedMessage,
      loadCurrentAccount,
      loadAdminUsers,
      handleCreateAdminUser,
      handleEditAdminUser,
      handleCancelUserEdit,
      handleAdminUserStatusToggle,
      handlePasswordSubmit,
      handleLogout,
      handleSessionExpired,
    };
  };
})(window);
