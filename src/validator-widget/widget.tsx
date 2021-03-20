import React = require("react")
import { Action, any, fromJSX, nothing, onlyIf, promise, Widget } from "widgets-for-react"
import { FieldState, ValidatorState, Result } from "."
import { failed } from "./rule"

/**
 * The IOWidget that contains the statemachine for the validator
 * @param s0    the current ValidatorState<?>
 */
export const validator = <a,>(s0:ValidatorState<a>): Widget<Action<ValidatorState<a>>> => any<Action<ValidatorState<a>>>()(
    Object.keys(s0.fields).map(k => {
        const key = k as keyof a
        if(s0.fields[key] == undefined) return nothing()
        return field(s0.fields[key]!).map(a => s1 => ({...s1, fields: {...s1.fields, [k]: a(s1.fields[key]!)}}))
    })
)

/**
 * The IOWidget that contains the statemachine for a single field 
 * @param s0    the current FieldState<?>
 */
const field = <root, prop>(s0: FieldState<root, prop>): Widget<Action<FieldState<root, prop>>> => any<Action<FieldState<root, prop>>>()([
    jobManager(s0),
    onlyIf(
        s0.jobs.current != null,
        promise<FieldState<root, prop>, Result>(
            s1 => s1.jobs.current!, 
            // todo: generic error msg here
            {on_fail: () => {console.log('fail'); return failed('generic')}}
        )(s0).map(r => s1 => s1.jobs.next == null
            ? ({ ...s1, kind: 'validated', result: r, jobs: { ...s1.jobs, current: undefined }})
            : ({ ...s1, jobs: { ...s1.jobs, current: undefined }})
        )
    )
])

/**
 * The IOWidget that manages the async jobs for a a single field
 * @param s0    the current FieldState<?>
 */
const jobManager = <root, prop>(s0: FieldState<root, prop>): Widget<Action<FieldState<root, prop>>> => fromJSX(c => {
    if(s0.jobs.next != undefined && s0.jobs.current == undefined) {
        c(s1 => ({
            ...s1,
            jobs: {
                current: s1.jobs.next!(),
                next: undefined
            }
        }))
    }
    return <></>
})