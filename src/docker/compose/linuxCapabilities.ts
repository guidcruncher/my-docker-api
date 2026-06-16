export const LinuxCapabilities: Record<string, string> = {
  AUDIT_CONTROL: "Enable and disable kernel auditing; change auditing filter rules",
  AUDIT_READ: "Allow reading the audit log via multicast netlink socket",
  AUDIT_WRITE: "Write records to kernel auditing log",

  BLOCK_SUSPEND: "Allow preventing system suspend",

  BPF: "Use bpf() syscall, create BPF maps/programs, attach to hooks",

  CHECKPOINT_RESTORE: "Checkpoint/restore processes with CRIU",

  CHOWN: "Make arbitrary changes to file UIDs and GIDs",

  DAC_OVERRIDE: "Bypass file read/write/execute permission checks",
  DAC_READ_SEARCH: "Bypass file read permission and directory search permission checks",

  FOWNER: "Bypass permission checks on operations that normally require file owner",
  FSETID: "Don't clear set-user-ID and set-group-ID bits when modifying files",

  IPC_LOCK: "Lock memory (mlock, mlockall) and prevent it from being swapped",
  IPC_OWNER: "Bypass permission checks for System V IPC objects",

  KILL: "Bypass permission checks for sending signals",

  LEASE: "Establish leases on arbitrary files",

  LINUX_IMMUTABLE: "Set the FS_IMMUTABLE_FL and FS_APPEND_FL flags",

  MAC_ADMIN: "Configure Mandatory Access Control (MAC) policies",
  MAC_OVERRIDE: "Override MAC access controls",

  MKNOD: "Create special files using mknod()",

  NET_ADMIN: "Perform network-related operations (interfaces, routing, firewall, etc.)",
  NET_BIND_SERVICE: "Bind to privileged ports (<1024)",
  NET_BROADCAST: "Make socket broadcasts, listen to multicasts",
  NET_RAW: "Use RAW and PACKET sockets",

  PERFMON: "Use performance monitoring and perf_event_open",

  SETGID: "Set group IDs arbitrarily",
  SETFCAP: "Set file capabilities",
  SETPCAP: "Modify process capabilities",
  SETUID: "Set user IDs arbitrarily",

  SYS_ADMIN: "Perform a wide range of system administration operations",
  SYS_BOOT: "Use reboot() and kexec_load()",
  SYS_CHROOT: "Use chroot()",
  SYS_MODULE: "Load and unload kernel modules",
  SYS_NICE: "Raise process priority and set scheduling policies",
  SYS_PACCT: "Configure process accounting",
  SYS_PTRACE: "Trace arbitrary processes using ptrace",
  SYS_RAWIO: "Perform raw I/O port operations",
  SYS_RESOURCE: "Override resource limits (RLIMITs)",
  SYS_TIME: "Set system clock",
  SYS_TTY_CONFIG: "Configure TTY devices",

  SYSLOG: "Read and clear kernel message ring buffer",

  WAKE_ALARM: "Trigger system wakeup alarms",
}
