# TypeScript Form Validator

* **Initiative fluent interface for declaring rules**
* **i18next intergration for simple rich validation messages**
* **Immutable datastructure meant to be used in React applications**
* **Type safe to reduce bugs and allow easy coding**
* **Supports the different UI patterns with regards to form validation**

## Creating validators

The `validator` function gets an object with the rules for the fields of the state as an argument. Note that the fields are optional, you don't have to define rules for all fields of your form. The rules are created with a lambda that gets a `RuleBuilder` as argument and returns a `Rule`. Rules can be composed with `and` and `or`. Which rules are aliviable on the `RuleBuilder` depends on the type of the field.

```ts
const initValidatorState = validator<FormData>({
  accept: b => b.is(true),
  name: b => b.alphaNumeric.and(b.min(2).and(b.max(255))),
  email: b => b.email
})
```

### Optional fields

In a form you can have fields that are optional, but if they are filled in they have to be validated. Examples for this are optional fields with a phonenummer or an email. To create a rule for this use the `or` operator with `empty` on the left and your rule on the rigth:

```ts
b => b.empty.or(b.phone)
```

### Async rules

Validation rules can also be async. An async rule is created the `asyncRule` function that takes a function `field -> Promise<Result>` as input.

```ts
b => asyncRule(emailTaken)
```

Async and sync rules can be composed by converting the sync rule to an async rule:

```ts
b => b.email.async().and(asyncRule(emailTaken))
```

### Combining collections of rules

Sometimes you have a field that has to follow a lot of rules. In cases like this you can use `all` to quickly combine them togther: 

```ts
b => b.required.and(b.hasCapital).and(b.hasLetter).and(b.hasNumber).and(b.min(8))

b => b.all(b.required, b.hasCapital, b.hasLetter, b.hasNumber, b.min(8))
```

### Dynamic rules

It is possible that a rule for a field depends on the state of the form. For example, a phone field can be optional or required based on if 2fa is enabled. In those situations you can use `pick` to pick the correct rule:

```ts
b => b.pick((_, form) => form.twoFactor ? b.required.and(b.phone) : b.empty.or(b.phone))
```

## Using validators

Validators are meant to be used in the state of a (React) application. The value `validator` returns is the initial state of type `ValidatorState<>`. See the snippet below for an example on how to declare and initialize a state:

```tsx
interface FormState {
    data: FormData,
    validator: ValidatorState<FormData>
}

class Form extends React.Component<{}, FormState> {

  state: FormState = {
    validator: initValidatorState,
    data: { accept: false, email: '', name: '' }
  }
}
```

The main method of the `ValidatorState` is `validate`. This method returns a new `ValidatorState` with the result of validating the provided data. The lambda shown below updates the state of the validation based on the new values: 
```ts
s => ({...s, validator: s.validator.validate(s.data)}
```

This can be used in the `onSubmit` of a form to validate all field when the form gets submitted:
```tsx
class Form extends React.Component<{}, FormState> {

  render() {
    return (
      <form onSubmit={e => {
        e.preventDefault()
        this.setState(s => ({...s, validator: s.validator.validate(s.data)}))
      }}>
        <button type="submit">submit</button>
      </form>
    )
  }
}
```

Note that `validate` has an additional optional parameter for the fieldname. If this argument is given only that field will be validated. If it is omitted as in the example all fields will be validated. This is useful for validate-as-you-type forms.

## Rendering messages

The `ValidatorState` has a method `message` that gives an error message, translated by `i18next`. In `i18next` you van define a translation for each rule in the library and in those translations you will get an object will all the data of the rule and the validated data. The `error` method on the `ValidationState` will tell you if there is any error. If the method gets no arguments it will return if there is any error on any field. If you pass it a fieldname it will return if there is an error for that field.

```ts
i18next.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        "alphaNumeric": "{{field}} must be alpa-numeric, '{{given}}' given",
        "min": "{{field}} must be at least {{expected}} characters long, {{length}} given",
        "max": "{{field}} must be max {{expected}} characters long, {{length}} given",
        "email": "{{field}} is not an email"
      }
    }
  }
})
```

```tsx
{this.state.validator.error('firstname') && <div>{this.state.validator.message('firstname')}</div>}
```

> todo:
> - list all the labels and arguments
> - translate the fieldnames
> - allow i18next namespacing to be used

## Clearing errors

To clear all error you can call `clear` on the `ValidatorState` and get a validator state with no errors inside. Note that this state will return `true` for `error` as the validator hasn't ran yet. Alternatifly you can provide `clear` with a fieldname and it will then only clear the error of that field. This is very useful for clear-errors-as-you-type forms. If you call `validate` with no argument to validate all fields all existing errors will be cleared

## Examples

See `src/index.tsx` for a longer example. The example form has three fields, one gets validated on submit, one gets validated on typing and one gets validated on submit and clears on type. You can run the example by cloning this repro and using `yarn start`.

> todo:
> - document all rules for the different types
