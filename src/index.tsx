import * as React from "react";
import * as ReactDOM from "react-dom";
import { validator, ValidatorState } from "./validator";
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

const initValidatorState = validator<FormData>({
  accept: b => b.is(true),
  firstname: b => b.alphaNumeric.and(b.min(2)).and(b.max(255)),
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
    return (
      <form noValidate onSubmit={e => {
        e.preventDefault()
        this.setState(s => ({...s, validator: s.validator.validate(s.data)}))
      }}>
        <div>
          <label htmlFor="firstname">Firstname (validate on submit)</label><br />
          <input 
            id="firstname"
            value={this.state.data.firstname}
            onChange={e => {
              const name = e.currentTarget.value
              this.setState(s => ({
                ...s, 
                data: {...s.data, firstname: name},
              }))
            }}
          />
          {this.state.validator.error('firstname') && <div>{this.state.validator.message('firstname')}</div>}
        </div>

        <div>
          <label htmlFor="lastname">Lastname (validate on type)</label><br />
          <input 
            id="lastname"
            value={this.state.data.lastname}
            onChange={e => {
              const lastname = e.currentTarget.value
              this.setState(s => ({
                ...s, 
                data: {...s.data, lastname},
                validator: s.validator.validate(s.data, 'lastname')
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
                validator: s.validator.clear('email')
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