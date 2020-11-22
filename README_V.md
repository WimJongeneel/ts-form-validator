# TypeScript Form Validator

* **Initiuve fluent interface for declaring rules**
* **i18next intergration for simple rich validation messages**
* **Immutable datastructure meant to be used in React applications**
* **Type safe to reduce bugs and allow easy coding**
* **Supports the different UI patterns with regards to form validation**

## Design priciples

* A validator get created for a type
* A validator has a state
* This state is an immutable data structure
* This state exposes methods for running the validator, retrieving and modifing

## Creating validators

The `validator` function gets an object with the rules for the fields of the state as an argument. Note that the fields are optional, you don't have to define rules for all fields of your form. The rules are created with a lambda that gets a `RuleBuilder` as argument and returns a `Rule`. Rules can be composed with `and` and `or`. Which rules are aliviable on the `RuleBuilder` depends on the type of the field.

```ts
const initValidatorState = validator<FormData>({
  accept: b => b.is(true),
  name: b => b.alphaNumeric.and(b.min(2).and(b.max(255))),
  email: b => b.email
})
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

The `ValidatorState` has a method `messageData` that gives you all the data about an error message in one object. This object is intended to be used as the arguments for a `i18next` translation. There are two fields that are always present on this object: `field` with the fieldname and `kind` with the name of the `Rule` that failed to validate. See the reference for all the other fields per `Rule`.

The `error` method on the `ValidationState` will tell you if there is any error. If the method gets no arguments it will return if there is any error on any field. If you pass it a fieldname it will return if there is an error for that field.

```tsx
const render = () => {
    if(this.state.validator.error('name') == false) return <></>
    const data = this.state.validator.messageData('name')
    return i18next.t('error:' + data.kind, data)
}
```

```json
{
    "error": {
        "alphaNumeric": "{{field}} must be alpa-numeric, {{given}} given",
        "min": "{{field}} must be at least {{expected}} characters long, {{length}} given",
        "max": "{{field}} must be at max {{expected}} characters long, {{length}} given"
    }
}
```

> todo:
> - type the data object for translations
> - translate the fieldnames

## Clearing errors

To clear all error you can call `clear` on the `ValidatorState` and get a validator state with no errors inside. Note that this state will return `true` for `error` as the validator hasn't ran yet. Alternatifly you can provide `clear` with a fieldname and it will then only clear the error of that field. This is very useful for clear-errors-as-you-type forms. If you call `validate` with no argument to validate all fields all existing errors will be cleared

## Reference

### Strings

### Booleans

### Numbers

### Dates