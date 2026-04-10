(function registerAdminAccountsPage(global) {
  const pageRegistry = (global.AdminPages = global.AdminPages || {});
  const behaviorRegistry = (global.AdminBehaviors = global.AdminBehaviors || {});

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
    const { el, deps, state } = context;
    let createUserFormInitialized = false;

    function syncAdminAuthHint() {
      if (deps.isAdminLoggedIn()) {
        deps.setText(el.adminAuthTipNode, "管理员已登录，可以执行审批、签到、过期和历史查询。");
        deps.setText(el.loginResultNode, "当前已登录管理员后台。");
        return;
      }

      deps.setText(el.adminAuthTipNode, "请先登录后再加载待审批列表。");
      deps.setText(el.loginResultNode, "默认管理员账号：admin / admin123456");
    }

    function adminFeaturesLockedMessage() {
      return "请先完成管理员密码修改，再继续使用后台功能。";
    }

    function buildAdminUserItem(user) {
      const wrapper = document.createElement("article");
      wrapper.className = "pending-item";
      wrapper.innerHTML = [
        `<h3>${user.username}</h3>`,
        '<div class="pending-meta">',
        `<p><strong>状态：</strong>${user.is_active ? "已启用" : "已禁用"}</p>`,
        `<p><strong>首次改密：</strong>${user.force_password_change ? "未完成" : "已完成"}</p>`,
        `<p><strong>创建时间：</strong>${deps.formatDateTime(user.created_at)}</p>`,
        "</div>",
      ].join("");

      const actionBar = document.createElement("div");
      actionBar.className = "actions";

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = user.is_active ? "ghost" : "";
      toggleButton.textContent = user.is_active ? "禁用账号" : "启用账号";
      toggleButton.addEventListener("click", async () => {
        await handleAdminUserStatusToggle(user.id, !user.is_active);
      });

      actionBar.appendChild(toggleButton);
      wrapper.appendChild(actionBar);
      return wrapper;
    }

    function ensureCreateUserTools() {
      if (createUserFormInitialized || !el.usersEmptyNode) {
        return;
      }

      const form = document.createElement("form");
      form.id = "create-user-form";
      form.className = "form";
      form.innerHTML = [
        '<label><span>新管理员账号</span><input name="new_username" type="text" placeholder="请输入管理员用户名" minlength="3" required></label>',
        '<label><span>初始密码</span><input name="new_user_password" type="password" placeholder="请输入初始密码" minlength="8" required></label>',
        '<label><span>账号状态</span><select name="new_user_active"><option value="true">启用</option><option value="false">禁用</option></select></label>',
        '<label><span>首次登录</span><select name="new_user_force_password_change"><option value="true">强制改密</option><option value="false">无需改密</option></select></label>',
        '<div class="actions"><button type="submit">新增管理员</button></div>',
      ].join("");

      const resultNode = document.createElement("p");
      resultNode.id = "create-user-result";
      resultNode.className = "status-text subtle";
      resultNode.textContent = "可在这里新增管理员测试账号或辅助审批账号。";

      form.addEventListener("submit", handleCreateAdminUser);
      el.usersEmptyNode.insertAdjacentElement("beforebegin", resultNode);
      resultNode.insertAdjacentElement("beforebegin", form);

      el.createUserForm = form;
      el.createUserResultNode = resultNode;
      createUserFormInitialized = true;
    }

    async function loadCurrentAccount() {
      if (!el.accountResultNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        state.setNeedsPasswordChange(false);
        deps.toggleHidden(el.accountCard, true);
        deps.setText(el.accountResultNode, "未登录，无法加载管理员账号信息。");
        deps.setText(el.passwordResultNode, "建议首次登录后立即修改默认密码。");
        return;
      }

      deps.toggleHidden(el.accountCard, false);
      deps.setText(el.accountResultNode, "正在加载当前管理员账号信息...");

      try {
        const account = await global.visitorApi.getCurrentAdmin();
        const forcePasswordChange = Boolean(account.force_password_change);
        state.setNeedsPasswordChange(forcePasswordChange);

        deps.setText(el.accountUsernameNode, account.username || "-");
        deps.setText(el.accountStatusNode, account.is_active ? "已启用" : "已禁用");
        deps.setText(el.accountCreatedAtNode, deps.formatDateTime(account.created_at));
        deps.setText(
          el.accountResultNode,
          forcePasswordChange
            ? "当前账号必须先修改密码，管理员后台功能会暂时锁定。"
            : "管理员账号信息已更新。",
        );
      } catch (error) {
        deps.setText(el.accountResultNode, `账号信息加载失败：${error.message}`);
      }
    }

    async function loadAdminUsers() {
      if (!el.usersResultNode || !el.usersListNode) {
        return;
      }

      ensureCreateUserTools();

      if (!deps.isAdminLoggedIn()) {
        deps.clearNode(el.usersListNode);
        deps.toggleHidden(el.usersEmptyNode, true);
        deps.setText(el.usersResultNode, "未登录，无法加载管理员账号列表。");
        return;
      }

      if (state.getNeedsPasswordChange()) {
        deps.clearNode(el.usersListNode);
        deps.toggleHidden(el.usersEmptyNode, true);
        deps.setText(el.usersResultNode, adminFeaturesLockedMessage());
        return;
      }

      deps.setText(el.usersResultNode, "正在加载管理员账号列表...");

      try {
        const users = await global.visitorApi.getAdminUsers();
        deps.clearNode(el.usersListNode);
        deps.toggleHidden(el.usersEmptyNode, users.length !== 0);
        users.forEach((user) => el.usersListNode.appendChild(buildAdminUserItem(user)));
        deps.setText(
          el.usersResultNode,
          users.length ? `已加载 ${users.length} 个管理员账号。` : "当前没有可展示的管理员账号。",
        );
      } catch (error) {
        deps.setText(el.usersResultNode, `管理员账号列表加载失败：${error.message}`);
      }
    }

    async function handleCreateAdminUser(event) {
      event.preventDefault();

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.createUserResultNode, "请先登录管理员账号。");
        return;
      }

      if (state.getNeedsPasswordChange()) {
        deps.setText(el.createUserResultNode, adminFeaturesLockedMessage());
        return;
      }

      const formData = new FormData(el.createUserForm);
      const payload = {
        username: formData.get("new_username"),
        password: formData.get("new_user_password"),
        is_active: formData.get("new_user_active") === "true",
        force_password_change: formData.get("new_user_force_password_change") === "true",
      };

      deps.setText(el.createUserResultNode, "正在创建管理员账号...");

      try {
        const user = await global.visitorApi.createAdminUser(payload);
        deps.setText(el.createUserResultNode, `管理员账号已创建：${user.username}`);
        el.createUserForm.reset();
        await loadAdminUsers();
      } catch (error) {
        deps.setText(el.createUserResultNode, `新增管理员失败：${error.message}`);
      }
    }

    async function handleAdminUserStatusToggle(userId, isActive) {
      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.usersResultNode, "请先登录管理员账号。");
        return;
      }

      deps.setText(el.usersResultNode, isActive ? "正在启用管理员账号..." : "正在禁用管理员账号...");

      try {
        await global.visitorApi.updateAdminUserStatus(userId, { is_active: isActive });
        await loadAdminUsers();
      } catch (error) {
        deps.setText(el.usersResultNode, `账号状态更新失败：${error.message}`);
      }
    }

    async function handleLoginSubmit(event) {
      event.preventDefault();

      const formData = new FormData(el.loginForm);
      const payload = {
        username: formData.get("username"),
        password: formData.get("password"),
      };

      deps.setText(el.loginResultNode, "正在登录...");

      try {
        const result = await global.visitorApi.login(payload);
        global.adminSession.setToken(result.access_token);
        deps.setText(
          el.loginResultNode,
          result.force_password_change
            ? `登录成功，欢迎 ${result.username}。请先修改默认密码。`
            : `登录成功，欢迎 ${result.username}。`,
        );
        el.loginForm.reset();
        syncAdminAuthHint();
        await loadCurrentAccount();
        await loadAdminUsers();
        if (!result.force_password_change) {
          await deps.refreshAdminData();
        }
      } catch (error) {
        deps.setText(el.loginResultNode, `登录失败：${error.message}`);
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
        const result = await global.visitorApi.changePassword(payload);
        deps.setText(el.passwordResultNode, result.message || "密码已更新。");
        el.passwordForm.reset();
        await loadCurrentAccount();
        await loadAdminUsers();
        if (!state.getNeedsPasswordChange()) {
          await deps.refreshAdminData();
        }
      } catch (error) {
        deps.setText(el.passwordResultNode, `密码修改失败：${error.message}`);
      }
    }

    function handleLogout() {
      global.adminSession.clearToken();
      deps.clearAdminViews();
      deps.stopScanner();
      deps.closeConfirmModal();
      state.setLastScannedAccessCode("");
      state.setNeedsPasswordChange(false);
      deps.clearValue(deps.getCheckInCodeInput());
      deps.clearValue(deps.getExpireCodeInput());
      deps.setText(el.adminResultNode, "已退出管理员登录。");
      deps.setText(el.historyResultNode, "已退出管理员登录。");
      deps.setText(el.operationResultNode, "尚未执行现场操作。");
      deps.setText(el.accountResultNode, "登录后可查看当前管理员账号信息。");
      deps.setText(el.passwordResultNode, "建议首次登录后立即修改默认密码。");
      deps.setText(el.usersResultNode, "登录后可查看管理员账号状态。");
      deps.clearNode(el.usersListNode);
      deps.toggleHidden(el.usersEmptyNode, true);
      deps.setScannerMessage("尚未开始扫码。");
      el.passwordForm?.reset();
      syncAdminAuthHint();
    }

    return {
      syncAdminAuthHint,
      adminFeaturesLockedMessage,
      loadCurrentAccount,
      loadAdminUsers,
      handleCreateAdminUser,
      handleAdminUserStatusToggle,
      handleLoginSubmit,
      handlePasswordSubmit,
      handleLogout,
    };
  };
})(window);
