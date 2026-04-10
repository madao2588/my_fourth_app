from app.models.user import User
from app.services.auth_service import hash_password


def create_appointment_payload(
    *,
    name: str = "张三",
    phone: str = "13800138000",
    reason: str = "商务拜访",
    target_person: str = "李经理",
    appointment_time: str = "2026-04-08T10:00:00",
) -> dict:
    return {
        "name": name,
        "phone": phone,
        "reason": reason,
        "target_person": target_person,
        "appointment_time": appointment_time,
    }


def login_admin_raw(client, password: str = "admin123456"):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": password},
    )
    assert response.status_code == 200
    return response.json()


def login_admin(client):
    payload = login_admin_raw(client)
    if payload["force_password_change"]:
        headers = {"Authorization": f"Bearer {payload['access_token']}"}
        change_response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "admin123456",
                "new_password": "newadmin123456",
            },
            headers=headers,
        )
        assert change_response.status_code == 200
        payload = login_admin_raw(client, password="newadmin123456")
    return {"Authorization": f"Bearer {payload['access_token']}"}


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_web_entry_pages_are_served(client):
    index_response = client.get("/")
    visitor_response = client.get("/visitor.html")
    admin_response = client.get("/admin.html")
    asset_response = client.get("/src/config/env.js")

    assert index_response.status_code == 200
    assert "text/html" in index_response.headers["content-type"]

    assert visitor_response.status_code == 200
    assert "text/html" in visitor_response.headers["content-type"]

    assert admin_response.status_code == 200
    assert "text/html" in admin_response.headers["content-type"]

    assert asset_response.status_code == 200
    assert "javascript" in asset_response.headers["content-type"]


def test_apply_and_query_latest_appointment(client):
    apply_response = client.post("/api/v1/apply", json=create_appointment_payload())
    assert apply_response.status_code == 201

    apply_payload = apply_response.json()
    assert apply_payload["status"] == "success"
    assert len(apply_payload["access_code"]) == 6

    query_response = client.get("/api/v1/query/13800138000")
    assert query_response.status_code == 200

    query_payload = query_response.json()
    assert query_payload["found"] is True
    assert query_payload["record"]["phone"] == "13800138000"
    assert query_payload["record"]["status"] == "pending"
    assert query_payload["record"]["approved_by"] is None


def test_admin_login_returns_token(client):
    payload = login_admin_raw(client)
    assert payload["token_type"] == "bearer"
    assert payload["username"] == "admin"
    assert payload["access_token"]
    assert payload["force_password_change"] is True


def test_default_admin_must_change_password_before_accessing_admin_features(client):
    payload = login_admin_raw(client)
    headers = {"Authorization": f"Bearer {payload['access_token']}"}

    pending_response = client.get("/api/v1/admin/pending", headers=headers)
    assert pending_response.status_code == 403
    assert "change your password" in pending_response.json()["detail"]

    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["force_password_change"] is True

    change_response = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "admin123456",
            "new_password": "newadmin123456",
        },
        headers=headers,
    )
    assert change_response.status_code == 200

    updated_login = login_admin_raw(client, password="newadmin123456")
    assert updated_login["force_password_change"] is False


def test_admin_can_get_current_account_and_change_password(client):
    payload = login_admin_raw(client)
    headers = {"Authorization": f"Bearer {payload['access_token']}"}

    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_payload = me_response.json()
    assert me_payload["username"] == "admin"
    assert me_payload["is_active"] is True
    assert me_payload["force_password_change"] is True

    change_response = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "admin123456",
            "new_password": "newadmin123456",
        },
        headers=headers,
    )
    assert change_response.status_code == 200
    assert change_response.json()["success"] is True

    old_login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123456"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "newadmin123456"},
    )
    assert new_login.status_code == 200
    assert new_login.json()["force_password_change"] is False


def test_admin_can_manage_user_active_status(client_and_session):
    client, session_factory = client_and_session
    headers = login_admin(client)

    session = session_factory()
    try:
        extra_user = User(
            username="security_admin",
            password_hash=hash_password("securepass123"),
            is_active=True,
            force_password_change=False,
        )
        session.add(extra_user)
        session.commit()
        session.refresh(extra_user)
        extra_user_id = extra_user.id
    finally:
        session.close()

    users_response = client.get("/api/v1/auth/users", headers=headers)
    assert users_response.status_code == 200
    assert len(users_response.json()) == 2

    disable_response = client.patch(
        f"/api/v1/auth/users/{extra_user_id}/status",
        json={"is_active": False},
        headers=headers,
    )
    assert disable_response.status_code == 200
    assert disable_response.json()["is_active"] is False

    self_disable_response = client.patch(
        "/api/v1/auth/users/1/status",
        json={"is_active": False},
        headers=headers,
    )
    assert self_disable_response.status_code == 400


def test_admin_can_create_new_admin_user(client):
    headers = login_admin(client)

    create_response = client.post(
        "/api/v1/auth/users",
        json={
            "username": "ops_admin",
            "password": "opsadmin123",
            "is_active": True,
            "force_password_change": True,
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    created_payload = create_response.json()
    assert created_payload["username"] == "ops_admin"
    assert created_payload["is_active"] is True
    assert created_payload["force_password_change"] is True

    duplicate_response = client.post(
        "/api/v1/auth/users",
        json={
            "username": "ops_admin",
            "password": "opsadmin123",
            "is_active": True,
            "force_password_change": True,
        },
        headers=headers,
    )
    assert duplicate_response.status_code == 400

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "ops_admin", "password": "opsadmin123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["force_password_change"] is True


def test_admin_endpoints_require_auth(client):
    response = client.get("/api/v1/admin/pending")
    assert response.status_code == 401
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "http_error"
    assert payload["detail"]


def test_validation_errors_use_unified_response_shape(client):
    response = client.post(
        "/api/v1/apply",
        json={"name": "", "phone": "", "reason": "", "target_person": "", "appointment_time": ""},
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "validation_error"
    assert payload["detail"]


def test_admin_can_approve_pending_appointment(client):
    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]
    headers = login_admin(client)

    pending_response = client.get("/api/v1/admin/pending", headers=headers)
    assert pending_response.status_code == 200
    assert len(pending_response.json()) == 1

    approve_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "同意来访"},
        headers=headers,
    )
    assert approve_response.status_code == 200

    approve_payload = approve_response.json()
    assert approve_payload["status"] == "approved"
    assert approve_payload["admin_remark"] == "同意来访"
    assert approve_payload["approved_by"] == "admin"
    assert approve_payload["approved_at"] is not None
    assert approve_payload["checked_in_at"] is None
    assert approve_payload["expired_at"] is None

    pending_after_response = client.get("/api/v1/admin/pending", headers=headers)
    assert pending_after_response.status_code == 200
    assert pending_after_response.json() == []


def test_admin_cannot_audit_non_pending_appointment(client):
    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]
    headers = login_admin(client)

    first_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "first audit"},
        headers=headers,
    )
    assert first_response.status_code == 200

    second_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "reject", "remark": "second audit"},
        headers=headers,
    )
    assert second_response.status_code == 400
    assert "pending" in second_response.json()["detail"].lower()


def test_admin_can_check_in_approved_appointment(client):
    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]
    access_code = create_response.json()["access_code"]
    headers = login_admin(client)

    approve_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "现场可放行"},
        headers=headers,
    )
    assert approve_response.status_code == 200

    check_in_response = client.post(
        "/api/v1/admin/check-in",
        json={"access_code": access_code},
        headers=headers,
    )
    assert check_in_response.status_code == 200

    payload = check_in_response.json()
    assert payload["status"] == "approved"
    assert payload["checked_in_at"] is not None
    assert payload["approved_by"] == "admin"

    repeat_check_in = client.post(
        "/api/v1/admin/check-in",
        json={"access_code": access_code},
        headers=headers,
    )
    assert repeat_check_in.status_code == 400


def test_admin_cannot_audit_checked_in_appointment(client):
    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]
    access_code = create_response.json()["access_code"]
    headers = login_admin(client)

    approve_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "approved"},
        headers=headers,
    )
    assert approve_response.status_code == 200

    check_in_response = client.post(
        "/api/v1/admin/check-in",
        json={"access_code": access_code},
        headers=headers,
    )
    assert check_in_response.status_code == 200

    re_audit_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "reject", "remark": "re-audit after check-in"},
        headers=headers,
    )
    assert re_audit_response.status_code == 400
    assert "pending" in re_audit_response.json()["detail"].lower()


def test_admin_can_inspect_appointment_by_access_code(client):
    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]
    access_code = create_response.json()["access_code"]
    headers = login_admin(client)

    approve_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "允许来访"},
        headers=headers,
    )
    assert approve_response.status_code == 200

    inspect_response = client.post(
        "/api/v1/admin/inspect",
        json={"access_code": access_code},
        headers=headers,
    )
    assert inspect_response.status_code == 200

    payload = inspect_response.json()
    assert payload["id"] == record_id
    assert payload["access_code"] == access_code
    assert payload["status"] == "approved"
    assert payload["approved_by"] == "admin"


def test_admin_can_expire_approved_appointment(client):
    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]
    access_code = create_response.json()["access_code"]
    headers = login_admin(client)

    approve_response = client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "等待到访"},
        headers=headers,
    )
    assert approve_response.status_code == 200

    expire_response = client.post(
        "/api/v1/admin/expire",
        json={"access_code": access_code},
        headers=headers,
    )
    assert expire_response.status_code == 200

    payload = expire_response.json()
    assert payload["status"] == "expired"
    assert payload["expired_at"] is not None
    assert payload["checked_in_at"] is None

    check_in_after_expire = client.post(
        "/api/v1/admin/check-in",
        json={"access_code": access_code},
        headers=headers,
    )
    assert check_in_after_expire.status_code == 400


def test_admin_history_supports_filters(client):
    headers = login_admin(client)

    client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="张三", phone="13800138000"),
    )
    second_create = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="李四", phone="13900139000"),
    )
    second_record_id = second_create.json()["application_id"]

    reject_response = client.put(
        f"/api/v1/admin/approve/{second_record_id}",
        json={"action": "reject", "remark": "时间冲突"},
        headers=headers,
    )
    assert reject_response.status_code == 200

    history_response = client.get("/api/v1/admin/list", headers=headers)
    assert history_response.status_code == 200
    assert history_response.json()["total"] == 2
    assert len(history_response.json()["items"]) == 2

    rejected_only = client.get("/api/v1/admin/list?status=rejected", headers=headers)
    assert rejected_only.status_code == 200
    rejected_payload = rejected_only.json()["items"]
    assert len(rejected_payload) == 1
    assert rejected_payload[0]["phone"] == "13900139000"
    assert rejected_payload[0]["approved_by"] == "admin"
    assert rejected_payload[0]["approved_at"] is not None

    phone_filtered = client.get("/api/v1/admin/list?phone=1380", headers=headers)
    assert phone_filtered.status_code == 200
    phone_payload = phone_filtered.json()["items"]
    assert len(phone_payload) == 1
    assert phone_payload[0]["name"] == "张三"


def test_admin_history_filters_by_appointment_time_range(client):
    headers = login_admin(client)

    morning_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(
            name="morning_visitor",
            phone="13812340001",
            appointment_time="2026-04-08T09:00:00+00:00",
        ),
    )
    afternoon_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(
            name="afternoon_visitor",
            phone="13812340002",
            appointment_time="2026-04-08T15:00:00+00:00",
        ),
    )

    assert morning_response.status_code == 201
    assert afternoon_response.status_code == 201

    filtered_response = client.get(
        "/api/v1/admin/list?date_from=2026-04-08T12:00:00%2B00:00&date_to=2026-04-08T18:00:00%2B00:00",
        headers=headers,
    )
    assert filtered_response.status_code == 200

    payload = filtered_response.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["name"] == "afternoon_visitor"


def test_admin_history_supports_server_side_pagination(client):
    headers = login_admin(client)

    for index in range(7):
        response = client.post(
            "/api/v1/apply",
            json=create_appointment_payload(
                name=f"访客{index}",
                phone=f"1390000000{index}",
            ),
        )
        assert response.status_code == 201

    page_one = client.get("/api/v1/admin/list?page=1&page_size=5", headers=headers)
    page_two = client.get("/api/v1/admin/list?page=2&page_size=5", headers=headers)

    assert page_one.status_code == 200
    assert page_two.status_code == 200

    page_one_payload = page_one.json()
    page_two_payload = page_two.json()

    assert page_one_payload["total"] == 7
    assert page_one_payload["page"] == 1
    assert page_one_payload["page_size"] == 5
    assert len(page_one_payload["items"]) == 5

    assert page_two_payload["total"] == 7
    assert page_two_payload["page"] == 2
    assert page_two_payload["page_size"] == 5
    assert len(page_two_payload["items"]) == 2


def test_admin_stats_returns_dashboard_counts(client):
    headers = login_admin(client)

    pending_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="待审批访客", phone="13811110000"),
    )
    approved_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="已签到访客", phone="13822220000"),
    )
    rejected_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="已拒绝访客", phone="13833330000"),
    )
    expired_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="已过期访客", phone="13844440000"),
    )

    approved_id = approved_response.json()["application_id"]
    approved_code = approved_response.json()["access_code"]
    rejected_id = rejected_response.json()["application_id"]
    expired_id = expired_response.json()["application_id"]
    expired_code = expired_response.json()["access_code"]

    assert pending_response.status_code == 201

    client.put(
        f"/api/v1/admin/approve/{approved_id}",
        json={"action": "approve", "remark": "允许来访"},
        headers=headers,
    )
    client.post(
        "/api/v1/admin/check-in",
        json={"access_code": approved_code},
        headers=headers,
    )
    client.put(
        f"/api/v1/admin/approve/{rejected_id}",
        json={"action": "reject", "remark": "时间冲突"},
        headers=headers,
    )
    client.put(
        f"/api/v1/admin/approve/{expired_id}",
        json={"action": "approve", "remark": "超时未到访"},
        headers=headers,
    )
    client.post(
        "/api/v1/admin/expire",
        json={"access_code": expired_code},
        headers=headers,
    )

    stats_response = client.get("/api/v1/admin/stats", headers=headers)
    assert stats_response.status_code == 200

    payload = stats_response.json()
    assert payload["total"] == 4
    assert payload["pending"] == 1
    assert payload["approved"] == 1
    assert payload["rejected"] == 1
    assert payload["expired"] == 1
    assert payload["checked_in"] == 1


def test_admin_overview_returns_today_summary_and_recent_activity(client):
    headers = login_admin(client)

    approved_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="今日签到访客", phone="13855550000"),
    )
    rejected_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="今日拒绝访客", phone="13866660000"),
    )
    expired_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(name="今日过期访客", phone="13877770000"),
    )

    approved_id = approved_response.json()["application_id"]
    approved_code = approved_response.json()["access_code"]
    rejected_id = rejected_response.json()["application_id"]
    expired_id = expired_response.json()["application_id"]
    expired_code = expired_response.json()["access_code"]

    client.put(
        f"/api/v1/admin/approve/{approved_id}",
        json={"action": "approve", "remark": "允许到访"},
        headers=headers,
    )
    client.post(
        "/api/v1/admin/check-in",
        json={"access_code": approved_code},
        headers=headers,
    )
    client.put(
        f"/api/v1/admin/approve/{rejected_id}",
        json={"action": "reject", "remark": "时间冲突"},
        headers=headers,
    )
    client.put(
        f"/api/v1/admin/approve/{expired_id}",
        json={"action": "approve", "remark": "等待签到"},
        headers=headers,
    )
    client.post(
        "/api/v1/admin/expire",
        json={"access_code": expired_code},
        headers=headers,
    )

    response = client.get("/api/v1/admin/overview", headers=headers)
    assert response.status_code == 200

    payload = response.json()
    assert payload["today"]["created"] == 3
    assert payload["today"]["pending"] == 0
    assert payload["today"]["approved"] == 2
    assert payload["today"]["rejected"] == 1
    assert payload["today"]["checked_in"] == 1
    assert payload["today"]["expired"] == 1

    assert payload["recent_activity"]
    assert len(payload["recent_activity"]) <= 8
    event_types = {item["event_type"] for item in payload["recent_activity"]}
    assert "created" in event_types
    assert "checked_in" in event_types
    assert "expired" in event_types


def test_admin_can_expire_stale_approved_appointments(client):
    headers = login_admin(client)

    stale_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(
            name="过期访客",
            phone="13888880000",
            appointment_time="2026-04-01T10:00:00+00:00",
        ),
    )
    fresh_response = client.post(
        "/api/v1/apply",
        json=create_appointment_payload(
            name="未过期访客",
            phone="13899990000",
            appointment_time="2026-04-08T10:00:00+00:00",
        ),
    )

    stale_id = stale_response.json()["application_id"]
    stale_code = stale_response.json()["access_code"]
    fresh_id = fresh_response.json()["application_id"]

    client.put(
        f"/api/v1/admin/approve/{stale_id}",
        json={"action": "approve", "remark": "等待到访"},
        headers=headers,
    )
    client.put(
        f"/api/v1/admin/approve/{fresh_id}",
        json={"action": "approve", "remark": "等待到访"},
        headers=headers,
    )

    expire_response = client.post("/api/v1/admin/expire-stale", headers=headers)
    assert expire_response.status_code == 200

    payload = expire_response.json()
    assert payload["expired_count"] == 1
    assert payload["threshold_hours"] == 48

    stale_record = client.post(
        "/api/v1/admin/inspect",
        json={"access_code": stale_code},
        headers=headers,
    )
    assert stale_record.status_code == 200
    stale_payload = stale_record.json()
    assert stale_payload["status"] == "expired"
    assert stale_payload["expired_at"] is not None

    history_response = client.get("/api/v1/admin/list?status=approved", headers=headers)
    assert history_response.status_code == 200
    approved_records = history_response.json()["items"]
    assert len(approved_records) == 1
    assert approved_records[0]["id"] == fresh_id


def test_admin_can_read_recent_logs(client):
    headers = login_admin(client)

    create_response = client.post("/api/v1/apply", json=create_appointment_payload())
    record_id = create_response.json()["application_id"]

    client.put(
        f"/api/v1/admin/approve/{record_id}",
        json={"action": "approve", "remark": "日志测试"},
        headers=headers,
    )

    response = client.get("/api/v1/admin/logs?limit=20", headers=headers)
    assert response.status_code == 200

    payload = response.json()
    assert payload
    assert len(payload) <= 20
    assert all("timestamp" in item for item in payload)
    assert any("appointment_audited" in item["message"] for item in payload)

    info_only = client.get("/api/v1/admin/logs?limit=20&level=INFO", headers=headers)
    assert info_only.status_code == 200
    info_payload = info_only.json()
    assert info_payload
    assert all(item["level"] == "INFO" for item in info_payload)

    keyword_only = client.get(
        "/api/v1/admin/logs?limit=20&keyword=appointment_audited",
        headers=headers,
    )
    assert keyword_only.status_code == 200
    keyword_payload = keyword_only.json()
    assert keyword_payload
    assert all("appointment_audited" in item["message"] for item in keyword_payload)

    date_filtered = client.get(
        "/api/v1/admin/logs?limit=20&date_from=2099-01-01T00:00:00",
        headers=headers,
    )
    assert date_filtered.status_code == 200
    assert date_filtered.json() == []
