# TradeLike Permissions Matrix

This matrix controls field-level access by role. `Write` includes read access, `Read` allows display only, and `Hidden` removes the field from secured DTO projections.

| Role | Entity | Field | Default |
| --- | --- | --- | --- |
| CustomerEmployee | Jobs | InternalNotes | Hidden |
| CustomerManager | Quote | MarginPence | Read |
| CustomerDirector | * | * | Write |
| Director | * | * | Write |
| Staff | * | * | Write |

Directors can edit the matrix from the permissions settings page. Backend callers should use `IPermissionService.CanReadAsync` and `IPermissionService.CanWriteAsync` before returning or accepting sensitive fields.
