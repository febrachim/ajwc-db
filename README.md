

### Requirements
- nodejs v7.5.0 or higher
- yarn

### Documentation
#### Directory Structure
Each module will be placed under `src/modules` directory. As a rule of thumb, split modules into small chunks. All public API should be exposed via `index.js`, even there is no limitation in NodeJS, it is considered best practice as it will prevent us to import something unknown and prevent tightly-coupled modules. Think the `index.js` as a gateway to exchange things.

Example:

```js
// src/modules/users/model.js
export class Person {
  static id: Int;
  static name: String;
}
```

```js
// src/modules/users/index.js
import * as model from './model';
export model;
```

```js
// src/modules/comments/model.js
import { model } from '../users';

class Comment {
  static id: Int;
  static person: model.Person;
}
```

#### Configuration
Base configuration file is located inside `/config` directory, the `index.js` will be overriden by the local configuration. Local configuration is excluded from the repository and depends on the `NODE_ENV` value. For example, in development environment, the local config file should be `development.local.js`.

#### CLI Commands
Here's list of commands you can use:
- `yarn run lint` run linter (eslint with airbnb config)
- `yarn run check` run flow static typing check. https://github.com/facebook/flow
- `yarn run test` run jest test
- `yarn run test:coverage` run jest test with code coverage
- `yarn run build` transpile all js files under `src` directory into `build` folder
- `yarn run build:watch` build with watcher enabled
- `yarn run start` run app server

### Contributing
We will be using gitflow as a standard collaborating flow. This is a good start to read https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow.

Before you commit and push to your branch, make sure you have tested it out, and rebase your branch if necessary. After you've finished with your feature branch, don't forget to create a pull request (PR) to develop branch. Keep the PR small and clean!

Happy contributing!
"# ajwc-db" 
