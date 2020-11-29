import * as React from "react";
import * as ReactDOM from "react-dom";
import { asyncRule, passed, validator, ValidatorState, validatorState } from "./validator-widget";
import i18next = require("i18next");

i18next.default.init({
  ns: ["error"],
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

interface FormData {
  firstname: string
  lastname: string
  email: string
  accept: boolean
}

const delay = asyncRule(() => new Promise(r => setTimeout(() => r(passed), Math.random() * 1000 + 150)))

const initValidatorState = validatorState<FormData>({
  accept: b => b.is(true),
  firstname: b => delay.and(b.alphaNumeric.and(b.min(2)).and(b.max(255)).async()),
  lastname: b => b.alphaNumeric.and(b.min(2)).and(b.max(255)),
  email: b => b.email
})

interface FormState {
    data: FormData,
    validator: ValidatorState<FormData>
}

class Form extends React.Component<{}, FormState> {

  state: FormState = {
    validator: initValidatorState,
    data: { accept: false, email: '', firstname: '', lastname: '' }
  }

  render() {
    console.log(this.state.validator.fields.lastname?.jobs)

    return (
      <form noValidate onSubmit={e => {
        e.preventDefault()
        this.setState(s => ({...s, validator: s.validator.validate(s.data)}))
      }}>
        {validator(this.state.validator).run(a => this.setState(s1 => ({...s1, validator: a(s1.validator)})))}
        <div>
          <label htmlFor="firstname">Firstname (validate on submit)</label><br />
          <input 
            autoComplete="none"
            id="firstname"
            value={this.state.data.firstname}
            onChange={e => {
              const name = e.currentTarget.value
              this.setState(s => ({
                ...s, 
                data: {...s.data, firstname: name},
                validator: s.validator.validate({...s.data, firstname: name}, 'firstname')
              }))
            }}
          />
          {this.state.validator.error('firstname') && <div>{this.state.validator.message('firstname')}</div>}
        </div>

        <div>
          <label htmlFor="lastname">Lastname (validate on type)</label><br />
          <input 
            autoComplete="none"
            id="lastname"
            value={this.state.data.lastname}
            onChange={e => {
              const lastname = e.currentTarget.value
              this.setState(s => ({
                ...s, 
                data: {...s.data, lastname},
                validator: s.validator.validate({...s.data, lastname}, 'lastname', 350)
              }))
            }}
          />
          {this.state.validator.error('lastname') && <div>{this.state.validator.message('lastname')}</div>}
        </div>

        <div>
          <label htmlFor="email">Email (validate on submit and clear on type)</label><br />
          <input 
            id="email"
            type="email"
            value={this.state.data.email}
            onChange={e => {
              const email = e.currentTarget.value
              
              this.setState(s => ({
                ...s, 
                data: {...s.data, email},
                // validator: s.validator.clear('email')
              }))
            }}
          />
          {this.state.validator.error('email') && <div>{this.state.validator.message('email')}</div>}
        </div>

        <div>
          <button type="submit">submit</button>
        </div>
      </form>
    )
  }
}

ReactDOM.render(
  <Form />,
  document.getElementById("example")
);