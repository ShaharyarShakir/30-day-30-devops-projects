package kubernetes.admission

# Deny images from registries other than GHCR
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not startswith(container.image, "ghcr.io/shaharyarshakir/")
    msg := sprintf("Container image '%v' is rejected. Only approved registry (ghcr.io/shaharyarshakir/) is allowed.", [container.image])
}

# Deny privileged containers
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("Privileged container '%v' is forbidden for security compliance.", [container.name])
}

# Enforce resource limits
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.cpu
    msg := sprintf("Container '%v' must specify a CPU limit.", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container '%v' must specify a memory limit.", [container.name])
}

# Enforce mandatory labels
deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.metadata.labels.app
    msg := "Pod is missing the mandatory deployment label 'app'."
}
