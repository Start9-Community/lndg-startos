ARG IMAGE
FROM ${IMAGE}
# The base image's certifi is only as current as its last release.
RUN python3 -m pip install --no-cache-dir --upgrade --root-user-action=ignore 'certifi>=2026.10.19' \
 && ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr "$(python3 -m certifi)"
# Upstream deltas we carry — see patches/README.md. --fuzz=0 so a base-image bump that changes
# the context fails the build instead of applying somewhere subtly wrong.
COPY patches /tmp/patches
RUN apk add --no-cache --virtual .patch patch \
 && for p in /tmp/patches/*.patch; do echo "applying $p"; patch -d /app -p1 --fuzz=0 <"$p" || exit 1; done \
 && apk del .patch \
 && rm -rf /tmp/patches
