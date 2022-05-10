# Tailwind without any frameworks
This project is using tailwind css with vanilla js only. This is achieved by using Tailwind [standalone CLI](https://tailwindcss.com/blog/standalone-cli)
# Get started
1. Install compatible executable [here](https://github.com/tailwindlabs/tailwindcss/releases/latest) and place it to Static folder (where `tailwind.config.js` located)
2. Now you will be able to use tailwind as if you were using any other js framework/library:
```shell
./tailwindcss -i .../styles/input.css -o .../styles/output.css --watch
```
3. For release/production version use `--minify` flag to compress outputted css file

# TODO: maybe come up with a script to automatically start watching for all pages