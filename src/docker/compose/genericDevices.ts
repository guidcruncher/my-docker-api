export const AllDevices: Record<string, string> = {
  // --- Generic Linux devices ---
  "/dev/null": "Null device (discard writes, read returns EOF)",
  "/dev/zero": "Zero-filled device (infinite zero bytes)",
  "/dev/random": "Blocking cryptographic random generator",
  "/dev/urandom": "Non-blocking cryptographic random generator",
  "/dev/full": "Always returns ENOSPC on write (testing tool)",

  "/dev/tty": "Controlling terminal for the container",
  "/dev/console": "System console device",
  "/dev/pts": "Pseudo-terminal devices (interactive shells)",

  "/dev/shm": "Shared memory filesystem",
  "/dev/mqueue": "POSIX message queue filesystem",

  "/dev/fuse": "FUSE filesystem interface (requires SYS_ADMIN)",
  "/dev/loop0": "Loopback block device (mount disk images)",
  "/dev/loop-control": "Loop device controller",

  "/dev/input": "Input devices (keyboard, mouse, gamepads)",
  "/dev/snd": "ALSA sound devices (audio input/output)",

  "/dev/bus/usb": "USB device tree (USB passthrough)",

  "/dev/cpu": "Per-CPU devices (MSRs, microcode)",
  "/dev/cpu_dma_latency": "CPU DMA latency tuning interface",

  "/dev/mem": "Physical memory access (privileged, dangerous)",
  "/dev/kmem": "Kernel virtual memory access (deprecated, privileged)",

  // --- Docker-specific devices ---
  "/dev/net/tun": "TUN/TAP virtual network interface (VPNs, WireGuard, etc.)",

  "/dev/vhost-net": "Kernel vhost acceleration for virtio-net",
  "/dev/vhost-vsock": "Host/guest vsock communication",

  "/dev/vfio/vfio": "VFIO core device (PCI passthrough)",
  "/dev/vfio/1": "VFIO IOMMU group 1 (GPU passthrough)",
  "/dev/vfio/2": "VFIO IOMMU group 2 (GPU passthrough)",

  "/dev/kvm": "KVM virtualization interface (QEMU, Firecracker)",

  // --- GPU devices (NVIDIA, AMD, Intel, generic DRM/DRI) ---
  "/dev/dri": "Direct Rendering Infrastructure root",
  "/dev/dri/card0": "Primary DRM GPU device (AMD/Intel/NVIDIA)",
  "/dev/dri/card1": "Secondary DRM GPU device",
  "/dev/dri/renderD128": "Render node for GPU compute (no display permissions)",
  "/dev/dri/renderD129": "Additional render node",

  "/dev/nvidia0": "Primary NVIDIA GPU device",
  "/dev/nvidia1": "Secondary NVIDIA GPU device",
  "/dev/nvidia2": "Additional NVIDIA GPU device",
  "/dev/nvidiactl": "NVIDIA control device (NVML, management)",
  "/dev/nvidia-uvm": "NVIDIA Unified Memory device",
  "/dev/nvidia-uvm-tools": "NVIDIA UVM tools device",
}
