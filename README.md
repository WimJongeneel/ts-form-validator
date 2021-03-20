# The Validator Widget

> see the sample in the register widget for a fully working sample

## State layout

When using the validator widget there are two things you have to keep in your state: the `FormData` and the `ValidatorState`. The `FormData` is the object that contains all the values of your field, this is the state you would always have when making a form. The `ValidatorState` holds the state of the validation. This state takes the type of the `FormData` as an argument. The `ValidatorState` will be initialized by the `validatorState` function from the widget library.

```ts
// FormData
interface RegisterFormData {
  name: string
  email: string
  // more
}

// FormState
interface RegisterState {
  input: RegisterFormData
  validations: ValidatorState<RegisterFormData>
}

// Initial FormState
const initialRegisterState: RegisterState = ({ 
  input: {
    name: '',
    email: '',
    // more
  },
  validations: validateState,
})
```

## Defining rules

The validation rules are defined when creating the initial state for the validator. The `validatorState` function is responsible for initialising the `ValidatorState<FormData>` from an object with rules for each field in type `FormData`. The rules are defined by a lambda function from a `RuleBuilder` (specific for the type of the current field, e.g. `StringRuleBuilder`, `NumberRuleBuilder` or `DateRuleBuilder`) to `Rule<field>`. With this construction it is only possible to define correct rules and autocomplete will help you discover which rules exist for your field:

```ts
const validateState = validatorState<RegisterFormData>({
  name: b => b.isRequired,
  accept: b => b.isTrue
})
```

### Combining rules

- `and` combines two rules in the same way that `&&` combines two boolean expressions. If the first rule fails, that (failed) result is the final result. Otherwise, the result of the second rule is the result. Example: `b.isRequired.and(b.email)`.
- `or` combines two rules in the same way that `||` combines two boolean expressions. If the first rule passes, that (passed) result is the final result. Otherwise, the result of the second rule is the result. Example: `b.isRequired.or(b.email)`.
- `all` combines multiple rules via the `and` operator. The first rule to fail is the result of the combination. If no rules fail the combination passes. Example: `b.all(b.isRequired, b.email)`.
- `any` combines multiple rules via the `or` operator. The first rule to pass is the result of the combination. If no rules passes the combination fails. Example: `b.any(b.isEmpty, b.email)`.

```ts
const validateState = validatorState<RegisterFormData>({
  username: b => b.hasMinLength(3).and(b.isAlphaNumeric),
  phone: b => b.isEmpty.or(b.isPhone),
  password: b => b.all(b.isRequired, b.hasCapital, b.hasLetter, b.hasNumber, b.hasMinLength(8))
})
```

### Async rules

Rules can be async. Async rules can be created from a function `a => Promise<Result>` with the `fromPromise` function. Those rules can also be composed with other async rules by using `and` and `or`. Normal (sync) rules can be combined with async rules by calling `.async()` on the sync rule to convert them into async rules:

```ts
const validateState = validatorState<RegisterFormData>({
  email: b => fromPromise(emailTaken),
  email1: b => b.isRequired.and(b.isEmail).async().and(fromPromise(emailTaken)),
})
```

### Optional fields

An optional field which has a rule that has to be validated when the field is filled by the user (e.g. an optional phone field that has to be either empty or filled with a valid phone number) can be validated by combing the rule for the value with `isEmpty` via `or`. With this construction the field will either pass the empty rule or show the result of the right rule:

```ts
const validateState = validatorState<RegisterFormData>({
  phone: b.isEmpty.or(b.isPhone)
})
```

### Dynamic rules

Sometimes the rule that should be used depends on the state of the form. In cases like this you can use the `fromState` function to pick which rule should be used based on the current value of the state. E.g. a phone field that is only required when the user turned 2FA auth on:

```ts
const validateState = validatorState<RegisterFormData>({
  phone: b => b.fromState((phone, form) => form.twoFactor ? b.isRequired.and(b.isPhone) : b.isEmpty.or(b.isPhone)),
})
```

> see `rule-builders.ts` for all the rules

## Validating, rendering and labels

To run the validator you call `validate` on the `ValidatorState` to get a new `ValidatorState`. This state will have the results of all the sync rules and the async rules will all be `validating`:

```ts
const registerUpdaters = {
  submit: (register: RegisterState) => ({
      ...register,
      validations: register.validations.validate(register.input)
    })
}
```

There are two options you can give to validate: `field` and `delay`. `field` can be used to only validate one field of your state instead of everything. `delay` van be used to validate after a certain amount of time (in ms). The combination of those two can be used to create validate-as-you-stop-typing fields. This is demonstrated in the email field in the registerform sample:

```ts
const registerUpdaters = {
  email: (newValue: string): Updater<RegisterState> =>
    register => ({ 
      ...register, 
      input: { ...register.input, email: newValue },
      validations: register.validations.validate({ ...register.input, email: newValue }, 'email', 300)
  })
}
```

Rendering validation error is done with the `error`, `passes` and `message` methods on the `ValidatorState`. `error` and `passes` return booleans that indicate if a field has been validated and either failed or passed its rule. `message` return a string with the validation message if the field failed and `null` otherwise. The messages are created with `i18next`.

```tsx
<RegisterLayout.FormItemInGroup
  controlId="name" 
  name="Name"
  value={currentState.input.name}
  onChange={(newValue => setState(registerUpdaters.name(newValue)))}
  error={currentState.validations.error('name')}
  validation={currentState.validations.message('name')}
/>
```

The translation for a rule is looked up by the key `rule__[RULENAME]__[FIELDNAME]`. If this key is not found the translation is looked up by `rule__[RULENAME]`. The fieldnames provided in the translations data is first translated by the translation `label__[FIELDNAME]`. Note that `message` accepts an option object in which you can provide an additional namespace, override the translation key and add more argument data.

```json
{
  "rule__alphaNumeric": "{{field}} must be alpa-numeric, '{{given}}' given",
  "rule__min": "{{field}} must be at least {{expected}} characters long, {{length}} given",
  "rule__max": "{{field}} must be max {{expected}} characters long, {{length}} given",
  "rule__email": "{{field}} is not an email",
  "rule__equalTo": "{{field}} should be equal to {{key}}",
  "rule__hasCapital": "{{field}} should contain a capital",
  "rule__hasLetter": "{{field}} should contain a lowercase letter",
  "rule__hasNumber": "{{field}} should contain a number",
  "rule__required": "{{field}} is required",
  "rule__emailTaken": "{{given}} is already registered",
  "rule__true__accept": "You have to accept our terms and conditions",
  "rule__true": "{{field}} should be true",
  "rule__phone": "{{field}} has to be a valid phone number",
  "rule__empty": "{{field}} should be empty ",
  "label__confirmPassword": "Confirm password",
  "label__name": "Name",
  "label__username": "Username",
  "label__email": "Email",
  "label__phone": "Phone",
  "label__password": "Password"
}
```

## The validator widget and async features

The `validator` widget itself is responsible for managing all the async components of the library. It is important to always render a `validator` widget in your application when using the validator, otherwise some feature might not work. See the `registerWidget` for an full example.

```tsx
any<Updater<RegisterState>>()([  
  validator(currentState.validations).map(registerUpdaters.validator),
  fromJSX(/** your form widget */)
])
```