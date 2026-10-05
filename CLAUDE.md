# Well-Body — Claude Code Handoff / Project Contract

## 1. Project identity

Project name: **Well-Body**  
App title shown to users: **減量進捗チェッカー**  
Repository: `a8cha8a/Well-Body`  
Default branch: `main`

Well-Body is an offline-capable, mobile-first weight-loss progress tracker intended primarily for iPhone/Safari use. The long-term goal is a practical, reliable personal health/nutrition tracking web app rather than a throwaway demo.

## 2. How to work on this repository

Treat the existing repository as the source of truth.

Before changing anything:
1. Read the current repository and inspect the existing implementation.
2. Do not assume that a feature is missing merely because it is not documented here.
3. Preserve working behavior unless the task explicitly requires changing it.
4. Prefer small, testable changes over a large rewrite.
5. When a requirement is ambiguous, preserve current behavior and flag the ambiguity rather than inventing a new behavior.
6. Validate syntax and run whatever automated/browser checks are available after changes.
7. Do not replace the application architecture wholesale without first explaining why the current architecture cannot support the requirement.
8. Keep the app usable offline wherever the requirement permits.
9. Avoid introducing dependencies when plain HTML/CSS/JS is sufficient.
10. Do not silently remove existing features.

For substantial changes, work on a feature branch and open a Pull Request rather than directly rewriting `main`.

## 3. Current implementation snapshot

At the time of handoff, the app is primarily a single `index.html` containing HTML, CSS, and JavaScript.

Existing functional areas include:

### Weight-loss plan
- Sex
- Age
- Height
- Starting weight
- Start date
- Goal date
- Goal weight
- Activity level
- BMR calculation
- Estimated TDEE
- Daily calorie target
- Remaining weight to goal

Activity levels currently use:
- 1.2 = low
- 1.375 = somewhat low
- 1.55 = normal
- 1.725 = high
- 1.9 = very high

The UI already contains concrete descriptions for these activity levels.

### Weight tracking
- Current weight display
- Weight entry by date
- Weight history
- Progress toward goal
- Planned pace / schedule summary
- Weight trend canvas graph

Data is currently persisted with browser `localStorage`.

### Nutrition / meal tracking
Meal categories:
1. Breakfast
2. Lunch
3. Snack
4. Dinner

Current demo food data contains:
- Chicken breast (skinless, cooked)
- Egg
- Firm tofu
- Natto
- White rice
- Apple

The food database is intentionally only demo data at this stage.

Current meal tracking supports:
- Food selection
- Quantity in grams
- Meal category
- Daily kcal total
- Daily protein/fat/carbohydrate totals
- Remaining kcal
- Remaining protein
- Remaining fat
- Remaining carbohydrate
- Calorie achievement rate
- Basic daily nutrition advice

Meal data is stored in `localStorage`.

### Voice input
Voice input is already implemented using Web Speech API / `SpeechRecognition` / `webkitSpeechRecognition`.

Current implementation supports:
- Start/stop voice input
- Japanese language (`ja-JP`)
- Food-name aliases
- Quantity parsing for grams and kilograms
- Some Japanese quantity forms
- Multiple food/quantity pairs in one recognition result
- Automatic addition of recognized items to a temporary voice-item queue
- Repeated recognition sessions while voice mode remains active
- Error handling for unsupported recognition, permission errors, and no-speech
- A visible stop button/state

Recent commits specifically addressed:
- Voice input demo
- Voice stop operation
- Food-name variation handling
- Multiple-food recognition
- Speech parsing
- A duplicate voice-state declaration
- iPhone voice-input reliability

Important: **voice input has been implemented in code but has not yet been conclusively validated on the user's physical iPhone in the final HTTPS production environment.** Do not claim it is fully verified until an actual device test succeeds.

## 4. Current technical limitations

The current implementation is still a prototype / functional foundation, not the finished Well-Body product.

Important known limitations:
- Food data is demo data, not the full MEXT database.
- Recipe/meal decomposition is not yet implemented at production quality.
- The food database needs to be expanded substantially.
- Nutrition calculations need to be based on the final authoritative food dataset.
- The voice parser is rule-based and should be hardened with tests and better Japanese natural-language handling.
- Browser SpeechRecognition behavior can vary by iOS/Safari version and hosting context.
- Apple Health integration is planned but not implemented.
- Activity-based adjustment of actual calorie expenditure is planned but not implemented.
- Recommendation logic is still basic / incomplete.
- The dashboard and trend views need further refinement as the app matures.
- Automated regression tests are not yet comprehensive.

## 5. Product goal

Well-Body should become a reliable, simple, single-device, mobile-first weight-loss management app.

The user should be able to manage the full loop:

**Plan → Record → Analyze → Adjust → Continue**

The main screen should make the current status understandable immediately.

The final experience should make it easy to answer:
- How much do I weigh now?
- How much remains to the target?
- Am I ahead/behind my planned pace?
- How many calories remain today?
- How much protein/fat/carbohydrate remains today?
- How much of today's target has been achieved?
- What have I eaten today?
- Is today's P/F/C balance reasonable?
- What should I eat next?
- Is my activity changing my actual expenditure?
- How is my weight/body-fat trend changing?

## 6. Nutrition requirements

The intended nutrition planning direction is approximately:
- Daily calorie target around 2,000 kcal as a planning baseline, but the app must calculate the actual target from the user's configured profile and goal period.
- P/F/C target ratio: **4:2:4** as the initial planning ratio.
- The app should calculate daily required P/F/C amounts from the active calorie target.
- Weekly aggregate P/F/C should be supportable in the future.

Food preferences/constraints that informed the original design:
- Fish should not be required.
- Banana should not be required.
- Yogurt should not be required.
- Protein powder should be minimized.
- Main protein sources can emphasize chicken breast, eggs, tofu, and natto.
- Main carbohydrate source should generally be rice.

These are product preferences, not reasons to hard-code a fixed menu. The app should eventually allow flexible food selection and substitution.

## 7. Food database direction

The intended production data source is the Japanese Ministry of Education, Culture, Sports, Science and Technology (MEXT) food composition data.

The roadmap is:
1. Obtain the authoritative MEXT dataset.
2. Normalize food names and units.
3. Preserve the authoritative nutrient values and source metadata.
4. Convert the data into a compact offline-friendly format.
5. Embed/package the data so normal logging works without an internet connection.
6. Support food search and aliases.
7. Add recipe/meal decomposition where appropriate.
8. Add tests for representative foods and calculated nutrient totals.

Do not invent nutrient values when authoritative data is available.

## 8. Voice-input requirements

Voice input is a core usability feature.

Desired examples include Japanese phrases such as:
- 「鶏むね肉150グラム」
- 「ご飯200グラム」
- Multiple foods spoken sequentially.

The system should:
1. Recognize speech.
2. Normalize Japanese/full-width numerals and punctuation where useful.
3. Identify the food.
4. Identify the amount.
5. Show the recognition result.
6. Allow correction before finalizing when confidence is low.
7. Preserve the selected meal category.
8. Add the resulting food(s) to the meal log.
9. Continue listening when appropriate.
10. Provide a clear stop action.
11. Fail gracefully when speech recognition or microphone permission is unavailable.

Do not assume SpeechRecognition will behave identically across all iOS/Safari versions. Build graceful fallback to manual entry.

## 9. Dashboard requirements

The app should converge toward one clear mobile dashboard.

Preferred conceptual order:
1. **減量プラン**
2. **記録**
3. **推移**

The user previously requested that current weight-loss status and trend be consolidated so the most important information is visible without unnecessary navigation.

The dashboard should prominently show:
- Current weight
- Goal weight
- Remaining kg
- Progress %
- Planned pace difference
- Today's calorie target
- Today's remaining kcal
- Today's remaining P/F/C
- Today's calorie achievement rate
- Today's meal/nutrition summary

Avoid clutter. Optimize for a phone screen.

## 10. Body-fat tracking

Body-fat percentage should be supported alongside body weight.

The long-term trend view should be capable of displaying:
- Body weight
- Body-fat %
- Date
- Progress toward goal
- Planned vs actual pace

Voice input should eventually be able to support body-weight and body-fat logging naturally.

## 11. Activity / expenditure roadmap

The final app should move beyond a static activity multiplier.

Desired future behavior:
- Use configured baseline activity assumptions.
- Incorporate actual activity amount where data is available.
- Adjust estimated actual calorie expenditure based on activity.
- Clearly distinguish estimated baseline expenditure from activity-adjusted expenditure.
- Avoid presenting uncertain estimates as exact facts.

## 12. Apple Health roadmap

Apple Health / HealthKit integration has been requested.

Potential future data:
- Body weight
- Body-fat percentage where available
- Steps / walking activity
- Other relevant activity metrics

The implementation must respect Apple's platform/security constraints and should not pretend that a normal web page can access HealthKit directly if the platform does not allow it.

If direct web access is not technically supported, design a native wrapper / companion architecture or an import/export workflow rather than promising unsupported behavior.

## 13. Offline-first requirement

Normal core functions should continue to work without network access:
- Plan calculation
- Weight recording
- Meal recording
- Nutrition calculation
- History
- Trend visualization
- Food lookup using the embedded dataset

If a feature inherently requires network access (for example a cloud AI service), clearly isolate that dependency and provide a useful offline fallback where practical.

Do not make the entire app dependent on an online API just to calculate basic nutrition.

## 14. Data persistence

The current prototype uses `localStorage`.

For the final app, evaluate whether `IndexedDB` is more appropriate as data volume grows, especially for:
- Large food datasets
- Many historical records
- Meals
- Body metrics
- Future synchronization

Do not migrate storage merely for architectural fashion. Migrate when the current storage model creates a real limitation.

## 15. Privacy and user data

Health/nutrition/weight information is sensitive.

Design principles:
- Minimize data collection.
- Keep personal data local by default.
- Do not send personal health data to external services unless the user explicitly enables a feature that requires it.
- Clearly distinguish local calculations from cloud/AI processing.
- Never hard-code a real user's private data into shared/public code.
- Avoid logging personal health information unnecessarily.

## 16. UI/UX principles

The app is primarily for iPhone.

Requirements:
- Mobile-first.
- Single-column / vertical layout where appropriate.
- No horizontal overflow.
- Date controls should remain compact and aligned.
- Touch targets should be easy to use.
- Voice button should be visually obvious.
- Error messages should be understandable to a non-developer.
- Avoid technical jargon in user-facing text.
- Keep important information above the fold where practical.
- Preserve a clean, simple visual style.

## 17. Calculation principles

Current prototype uses:
- Mifflin-St Jeor style BMR calculation.
- TDEE = BMR × activity multiplier.
- Initial calorie target approximately TDEE - 500 kcal, with a current minimum floor in the prototype.

Before changing this logic, evaluate:
- Goal date
- Required rate of weight loss
- Current weight
- Target weight
- Activity
- Safety constraints
- Whether the target is achievable within the selected period

The final app should not blindly use a fixed deficit when the goal period implies a different required rate.

## 18. Recommendations

The final app should provide useful, concise recommendations based on actual logged data.

Examples:
- If protein is low, suggest protein-rich foods that fit the user's preferences.
- If fat is already high, suggest lower-fat choices.
- If carbohydrate is low, suggest rice/appropriate carbohydrate portions.
- If calories remaining are small, suggest a suitable small meal/snack.
- If the user is consistently ahead/behind planned pace, explain the trend.

Recommendations must be based on actual logged values and configured goals, not generic motivational text.

## 19. Testing requirements

Before calling a feature complete:
- Validate HTML/JS syntax.
- Test core calculations with known values.
- Test empty states.
- Test invalid/edge inputs.
- Test localStorage persistence.
- Test mobile layout / no horizontal overflow.
- Test voice fallback behavior.
- Test food aliases.
- Test multiple-food voice input.
- Test adding/removing/refreshing meal data as the feature requires.
- Test dates around start/goal boundaries.
- Test goal already reached / weight above goal / missing dates.
- Test the app after a clean reload.

For browser-dependent features, use browser automation when available.

For iPhone-only behavior (microphone, Safari permissions, Apple Health), distinguish:
- code-level verification,
- browser automation verification,
- physical-device verification.

Never label a physical-device-only behavior as fully verified without a real device test.

## 20. Deployment

Current deployment target:
- GitHub repository: `a8cha8a/Well-Body`
- Vercel project: `well-body`

Vercel is already connected to the repository.

A production deployment has been created successfully and is currently Ready.

The production environment has had a deployment-protection/authentication issue that prevented straightforward anonymous verification of the public deployment. Do not rewrite application code to work around a hosting-authentication problem without first confirming the hosting configuration.

## 21. Git workflow

Preferred workflow:
- `main` = stable working version.
- Feature work = separate branch.
- Review diff before merge.
- Avoid destructive rewrites.
- Keep commits focused and descriptive.
- Do not mix unrelated UI, data, and infrastructure changes into one commit unless necessary.
- When possible, include tests with functional changes.

## 22. Current known state / handoff point

Current main HEAD:
`f09f09c834ac1bc2436fbb7f8df4e6b044996d9f`

Recent voice-related commits include:
- `f6a029e27f5873bb95a303115650bf8ec65fa400` — fixed duplicate voice recognition state declaration.
- `3c4088b9163ac8c23ec7ae743de23cf50188fbe6` — improved iPhone voice input reliability and multi-food capture.
- `d46bf75eb4a7e7bdba3e4552b75a5bf24074d20b` — fixed voice input script syntax error.

The latest application code is in `index.html`.

## 23. Do not lose these project decisions

Do not regress the following decisions without explicit review:
- The app should be useful as an offline-capable mobile app.
- Core dashboard information should be immediately understandable.
- Meal order is breakfast → lunch → snack → dinner.
- Remaining kcal AND remaining P/F/C should be visible.
- Daily achievement rate should be visible.
- Nutrition advice should be generated from actual food logs.
- Voice input should support multiple foods and clear stop control.
- Food data should eventually be authoritative and much larger than the current demo dataset.
- Rice is the preferred basic carbohydrate.
- Fish/banana/yogurt should not be required.
- Protein powder should be minimized.
- The user wants the simplest possible operation on one device where platform capabilities allow it.

## 24. Recommended next development sequence

Do not jump straight into Apple Health or a major rewrite.

Recommended order:
1. Establish a reliable automated browser test baseline.
2. Refactor the current single-file prototype only where it improves maintainability without changing behavior.
3. Lock down calculation tests.
4. Build the production food-data pipeline from authoritative MEXT data.
5. Add robust food search/aliases and nutrient calculation tests.
6. Harden meal logging and daily P/F/C calculations.
7. Harden voice input with automated parsing tests plus real iPhone/Safari verification.
8. Improve the single-screen dashboard and trend visualization.
9. Add recommendation logic.
10. Evaluate IndexedDB if the larger dataset makes localStorage inadequate.
11. Design the activity-adjustment model.
12. Investigate the technically supported Apple Health integration architecture.
13. Add synchronization/export only after local reliability is solid.
14. Continue deploying through Vercel with stable main + feature branches/PRs.

## 25. Definition of success

Well-Body is complete when a user can, from an iPhone with minimal friction:

1. Configure a weight-loss plan.
2. See a sensible daily calorie/PFC target.
3. Record weight and body-fat data.
4. Record meals manually or by voice.
5. Have food quantities converted into accurate kcal/P/F/C using authoritative data.
6. See today's intake and remaining kcal/P/F/C immediately.
7. See whether progress is ahead/behind plan.
8. Receive concise, data-driven recommendations.
9. Review historical records and trends.
10. Continue using core features offline.
11. Reliably use the app on iPhone Safari.
12. Keep personal health data private by default.
13. Optionally integrate activity/Health data only through technically supported mechanisms.

The guiding principle is:

**Do not optimize for a flashy demo. Optimize for a reliable, simple, accurate, maintainable personal weight-management tool.**
