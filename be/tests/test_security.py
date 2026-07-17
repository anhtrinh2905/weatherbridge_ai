from auth.keycloak import KeycloakVerifier


def test_keycloak_claims_map_to_application_user() -> None:
    verifier = object.__new__(KeycloakVerifier)
    verifier.settings = type("Settings", (), {"keycloak_client_id": "vai-code-fe"})()
    user = verifier._to_user(
        {
            "sub": "kc-user",
            "email": "person@example.com",
            "preferred_username": "person",
            "email_verified": True,
            "realm_access": {"roles": ["user"]},
            "resource_access": {"vai-code-fe": {"roles": ["builder"]}},
        }
    )
    assert user.id == "kc-user"
    assert user.email_verified is True
    assert user.roles == frozenset({"user", "builder"})
