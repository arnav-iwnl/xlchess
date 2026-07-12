# JavaScript Quickstart

**Example Repository**

- [JavaScript Quickstart Repo](https://github.com/clerk/clerk-javascript-quickstart)

**Before you start**

- [Set up a Clerk application](https://clerk.com/docs/getting-started/quickstart/setup-clerk.md)

To add the [JavaScript SDK](https://clerk.com/docs/reference/javascript/overview.md) to your JavaScript app, you have two options:

1. Install the package using a package manager, like `npm`.
2. Use the `<script>` tag to load the ClerkJS package from our CDN.

Use the following tabs to choose your preferred method.

**npm module**

1. ## Create a new JavaScript app

   To install Clerk's JavaScript SDK, you need to use a bundler like [Vite](https://vitejs.dev/) or [Webpack](https://webpack.js.org/).

   If you don't already have a JavaScript app, run the following commands to [create a new one using Vite](https://vitejs.dev/guide/#scaffolding-your-first-vite-project). From the prompts, choose the **Vanilla** framework, and then choose the **JavaScript** variant.

   ```npm
   npm create vite@latest clerk-javascript
   cd clerk-javascript
   npm install
   ```
2. ## Install `@clerk/clerk-js`

   The [Clerk JavaScript SDK](https://clerk.com/docs/reference/javascript/overview.md) gives you access to a set of classes and methods to make user authentication easier.

   Run the following command to install the SDK:

   ```npm
   npm install @clerk/clerk-js
   ```
3. ## Set your Clerk API keys

   It's recommended to use environment variables to store your Clerk Publishable Key. In JavaScript projects, you can store these values in an `.env` file and load them using your framework's env variable support. In Node.js, you can load `.env` files by starting your app with the `--env-file=.env` flag. For Vite projects, environment variables in an `.env` file at the project root are automatically accessible through the [`import.meta.env` object](https://vitejs.dev/guide/env-and-mode.html#env-variables).

   Add your Clerk Publishable Key to your `.env` file.

   1. In the Clerk Dashboard, navigate to the [**API keys**](https://dashboard.clerk.com/~/api-keys) page.
   2. In the **Quick Copy** section, copy your Clerk Publishable Key.
   3. Paste your key into your `.env` file.

   The final result should resemble the following:

   filename: .env

   ```env
   VITE_CLERK_PUBLISHABLE_KEY={{pub_key}}
   ```
4. ## Initialize Clerk

   To initialize Clerk, add the following code to your `main.js` file. This code does the following:

   - Imports your Publishable Key and derives the Clerk Frontend API domain from it.
   - Dynamically loads the UI bundle.
   - Creates a new [Clerk](https://clerk.com/docs/js-frontend/reference/objects/clerk.md) instance.
   - Calls the [load()](https://clerk.com/docs/js-frontend/reference/objects/clerk.md#load) method to initialize Clerk.

   filename: src/main.js

   ```js
   import { Clerk } from '@clerk/clerk-js'

   const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

   if (!publishableKey) {
     throw new Error('Add your VITE_CLERK_PUBLISHABLE_KEY to the .env file')
   }

   // Derive the Frontend API domain from the publishable key
   const clerkDomain = atob(publishableKey.split('_')[2]).slice(0, -1)

   // Loads the Clerk UI bundle
   await new Promise((resolve, reject) => {
     const script = document.createElement('script')
     script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`
     script.async = true
     script.crossOrigin = 'anonymous'
     script.onload = resolve
     script.onerror = () => reject(new Error('Failed to load @clerk/ui bundle'))
     document.head.appendChild(script)
   })

   const clerk = new Clerk(publishableKey)
   await clerk.load({
     ui: { ClerkUI: window.__internal_ClerkUICtor },
   })
   ```
5. ## Add Clerk components to your app

   Clerk's [prebuilt components](https://clerk.com/docs/js-frontend/reference/components/overview.md) are the easiest way to add authentication and user management to your app. They come styled out-of-the-box and are customizable to fit your app's design.

   To get started, add the following components to your app:

   - [<SignIn />](https://clerk.com/docs/js-frontend/reference/components/authentication/sign-in.md): Renders a user interface for signing in.
   - [<UserButton />](https://clerk.com/docs/js-frontend/reference/components/user/user-button.md): Shows the signed-in user's avatar. Selecting it opens a dropdown menu with account management options.

   Your `main.js` file should look something like this:

   filename: src/main.js

   ```js
   import { Clerk } from '@clerk/clerk-js'

   const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

   if (!publishableKey) {
     throw new Error('Add your VITE_CLERK_PUBLISHABLE_KEY to the .env file')
   }

   // Derive the Frontend API domain from the publishable key
   const clerkDomain = atob(publishableKey.split('_')[2]).slice(0, -1)

   // Loads the Clerk UI bundle
   await new Promise((resolve, reject) => {
     const script = document.createElement('script')
     script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`
     script.async = true
     script.crossOrigin = 'anonymous'
     script.onload = resolve
     script.onerror = () => reject(new Error('Failed to load @clerk/ui bundle'))
     document.head.appendChild(script)
   })

   const clerk = new Clerk(publishableKey)
   await clerk.load({
     ui: { ClerkUI: window.__internal_ClerkUICtor },
   })

   if (clerk.isSignedIn) {
     document.getElementById('app').innerHTML = `
       <div id="user-button"></div>
     `
     const userButtonDiv = document.getElementById('user-button')
     clerk.mountUserButton(userButtonDiv)
   } else {
     document.getElementById('app').innerHTML = `
       <div id="sign-in"></div>
     `
     const signInDiv = document.getElementById('sign-in')
     clerk.mountSignIn(signInDiv)
   }
   ```

   And your `index.html` file should look something like this:

   filename: index.html

   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <link rel="icon" type="image/svg+xml" href="/vite.svg" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>Vite App</title>
     </head>
     <body>
       <div id="app"></div>
       <script type="module" src="/src/main.js"></script>
     </body>
   </html>
   ```
6. ## Run your project

   Run your project with the following command:

   ```npm
   npm run dev
   ```
7. ## Create your first user

   1. Visit your app's homepage at http://localhost:5173.
   2. Select "Sign up" on the page and authenticate to create your first user.

**<script>**

1. ## Add the SDK using a `<script>` tag

   These `<script>` tags will load Clerk's UI bundle and JavaScript SDK from the CDN and initialize them with your Clerk Publishable Key and Frontend API URL. They should be placed before any other `<script>` tags that use the JavaScript SDK.

   > Clerk options passed as script tag attributes must be prefixed with `data-clerk-`. The script tag supports three attributes: `data-clerk-publishable-key` (`publishableKey`), `data-clerk-proxy-url` (`proxyUrl`), and `data-clerk-domain` (`domain`). All other options must be passed to Clerk's [load()](https://clerk.com/docs/js-frontend/reference/objects/clerk.md#load) method.

   1. In the Clerk Dashboard, navigate to the [**API keys**](https://dashboard.clerk.com/~/api-keys) page.
   2. In the **Quick Copy** section, select **JavaScript** from the dropdown menu.
   3. Copy the `<script>` tags and paste them into your HTML file, as shown in the following example:

   filename: index.html

   ```html
   <!-- Rest of your HTML file -->

   <script
     defer
     crossorigin="anonymous"
     src="https://{{fapi_url}}/npm/@clerk/ui@1/dist/ui.browser.js"
     type="text/javascript"
   ></script>

   <script
     defer
     crossorigin="anonymous"
     data-clerk-publishable-key="{{pub_key}}"
     src="https://{{fapi_url}}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
     type="text/javascript"
   ></script>
   ```
2. ## Listen for the `load` event

   Below the `<script>` tags that initialize the SDK, create another `<script>` tag that listens for the `load` event and calls Clerk's [load()](https://clerk.com/docs/js-frontend/reference/objects/clerk.md#load) method to load the SDK, as shown in the following example:

   filename: index.html

   ```html
   <!-- Rest of your HTML file -->

   <script>
     window.addEventListener('load', async function () {
       await Clerk.load({
         ui: { ClerkUI: window.__internal_ClerkUICtor },
       })

       console.log('ClerkJS is loaded')
     })
   </script>
   ```
3. ## Allow users to sign in or out

   Clerk's [prebuilt components](https://clerk.com/docs/js-frontend/reference/components/overview.md) are the easiest way to add authentication and user management to your app. They come styled out-of-the-box and are customizable to fit your app's design.

   To get started, you will use:

   - [<SignIn />](https://clerk.com/docs/js-frontend/reference/components/authentication/sign-in.md): renders a user interface for signing in.
   - [<UserButton />](https://clerk.com/docs/js-frontend/reference/components/user/user-button.md): Shows the signed-in user's avatar. Selecting it opens a dropdown menu with account management options.

   filename: index.html

   ```html
   <div id="app"></div>

   <script
     defer
     crossorigin="anonymous"
     src="https://{{fapi_url}}/npm/@clerk/ui@1/dist/ui.browser.js"
     type="text/javascript"
   ></script>

   <script
     defer
     crossorigin="anonymous"
     data-clerk-publishable-key="{{pub_key}}"
     src="https://{{fapi_url}}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
     type="text/javascript"
   ></script>

   <script>
     window.addEventListener('load', async function () {
       await Clerk.load({
         ui: { ClerkUI: window.__internal_ClerkUICtor },
       })

       if (Clerk.isSignedIn) {
         document.getElementById('app').innerHTML = `
           <div id="user-button"></div>
         `

         const userButtonDiv = document.getElementById('user-button')

         Clerk.mountUserButton(userButtonDiv)
       } else {
         document.getElementById('app').innerHTML = `
           <div id="sign-in"></div>
         `

         const signInDiv = document.getElementById('sign-in')

         Clerk.mountSignIn(signInDiv)
       }
     })
   </script>
   ```

## Next steps

Explore the most relevant next steps for your SDK using the following guides.

- [Prebuilt components](https://clerk.com/docs/reference/components/overview.md): Learn how to add Clerk's prebuilt authentication and user-management UI to your app.
- [Build custom flows](https://clerk.com/docs/guides/development/custom-flows/overview.md): Learn how to build custom user interfaces entirely from scratch using the Clerk API.
- [Clerk class reference](https://clerk.com/docs/reference/objects/clerk.md): Learn more about the Clerk class and how to use it.
- [Customization & localization](https://clerk.com/docs/guides/customizing-clerk/appearance-prop/overview.md): Learn how to customize and localize Clerk components.

## More to explore

Explore additional Clerk features that help you build, manage, and grow your application.

- [**Organizations**](https://clerk.com/docs/guides/organizations/overview.md) - Organizations are shared accounts that let teams collaborate, manage members and roles, and control access to shared resources.
- [**Billing**](https://clerk.com/docs/guides/billing/overview.md) - Billing enables you to manage subscriptions, free trials, payments, plans, and billing-related webhook events for B2C and B2B applications.
- [**Waitlist**](https://clerk.com/docs/guides/secure/restricting-access.md#waitlist) - Waitlist lets you collect signups and control access to new products or features before launch through a simple, integrated workflow.
