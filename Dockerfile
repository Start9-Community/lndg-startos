ARG IMAGE
FROM ${IMAGE}
# The base image's certifi is only as current as its last release.
RUN python3 -m pip install --no-cache-dir --upgrade --root-user-action=ignore 'certifi>=2026.10.19' \
 && ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr "$(python3 -m certifi)"
