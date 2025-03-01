{ pkgs }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.openssl.dev
  ];
  idx.extensions = [
    "eamodio.gitlens"
  ];
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [
          "npm"
          "run"
          "dev"
          "--"
          "--port"
          "$PORT"
        ];
        env = {
          NEXT_PUBLIC_VERCEL_ENV = "idx";
        };
        manager = "web";
      };
    };
  };
}
