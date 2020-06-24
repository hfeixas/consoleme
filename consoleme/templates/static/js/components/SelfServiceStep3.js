import _ from 'lodash';
import React, {Component} from 'react';
import {
    Button,
    Dimmer,
    Divider,
    Form,
    Header,
    Label,
    Loader,
    Message,
    Tab,
    Table,
    TextArea,
} from 'semantic-ui-react';
import {generate_id, getServiceTypes, sendRequestCommon} from '../helpers/utils';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";


class SelfServiceStep3 extends Component {
    state = {
        isLoading: false,
        isSuccess: false,
        justification: "",
        messages: [],
        requestId: null,
        statement: "",
    };

    async componentDidMount() {
        const {permissions} = this.props;
        const statement = {
            "Statement": [],
        };
        permissions.forEach(permission => {
            statement["Statement"].push(permission.policy);
        });
        this.setState({
            statement: JSON.stringify(statement, null, 4),
        });
    }

    buildPermissionsTable(role, permissions) {
        const serviceTypeOptions = getServiceTypes();
        const permissionRows = permissions.map(permission => {
            const found = _.find(serviceTypeOptions, {"key": permission.service});
            const serviceName = found.text;
            return (
                <Table.Row>
                    <Table.Cell>
                        {serviceName}
                    </Table.Cell>
                    <Table.Cell collapsing textAlign='left'>
                        {permission.value}
                    </Table.Cell>
                    <Table.Cell>
                        {
                            permission.actions.map(action => {
                                const actionDetail = _.find(found.actions, {"key": action});
                                return (
                                    <Label as="a" color="pink">
                                        {actionDetail.text}
                                    </Label>
                                );
                            })
                        }
                    </Table.Cell>
                </Table.Row>
            );
        });

        return (
            <Table celled striped selectable>
                <Table.Header>
                    <Table.HeaderCell>Service</Table.HeaderCell>
                    <Table.HeaderCell>Resource</Table.HeaderCell>
                    <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Header>
                <Table.Body>
                    {permissionRows}
                </Table.Body>
            </Table>
        );
    }

    handleSubmit() {
        const {role} = this.props;
        const {justification, statement} = this.state;

        if (!justification) {
            return this.setState({
                messages: ["No Justification is Given"],
            });
        }

        const {account_id, arn} = role;
        const policyName = generate_id();
        const policyType = "InlinePolicy";
        const request = {
            arn,
            account_id,
            justification,
            "data_list": [
                {
                    'type': policyType,
                    'name': policyName,
                    'value': statement,
                    'is_new': true,
                },
            ],
        };
        this.setState({
            isLoading: true,
        }, async () => {
            const response = await sendRequestCommon(
                JSON.stringify(request),
                '/policies/submit_for_review',
            );

            const messages = [];
            if (response) {
                const {request_id, status} = response;
                if (status === "success") {
                    return this.setState({
                        isLoading: false,
                        isSuccess: true,
                        messages,
                        requestId: request_id,
                    });
                } else {
                    messages.push("Failed to create a request");
                }
            } else {
                messages.push("Failed to submit a request");
            }
            this.setState({
                isLoading: false,
                messages,
            });
        });
    }

    handleJustificationChange(e) {
        this.setState({
            justification: e.target.value,
        });
    }

    render() {
        const {role, permissions} = this.props;
        const {isLoading, isSuccess, justification, messages, requestId, statement} = this.state;
        const messagesToShow = (messages.length > 0)
            ? (
                <Message negative>
                    <Message.Header>
                        There was an issue making a request.
                    </Message.Header>
                    <Message.List>
                        {
                            messages.map(message => {
                                return <Message.Item>{message}</Message.Item>;
                            })
                        }
                    </Message.List>
                </Message>
            )
            : null;
        const panes = [
            {
                menuItem: 'Review',
                render: () => (
                    <Tab.Pane>
                        <Header>
                            Please Review Permissions
                            <Header.Subheader>
                                You can customize your request using the JSON Editor for advanced permissions.
                            </Header.Subheader>
                        </Header>
                        <p>
                            Your new permissions will be attached to the role <a href={`/policies/edit/${role.account_id}/iamrole/${role.name}`} target="_blank">{role.arn}</a> with the followings.
                        </p>
                        {this.buildPermissionsTable(role, permissions)}
                        <Divider />
                        <Header>
                            Justification
                        </Header>
                        <Form>
                            <TextArea
                                onChange={this.handleJustificationChange.bind(this)}
                                placeholder={"Your Justification"}
                                value={justification}
                            />
                        </Form>
                        <Divider />
                        <Button
                            content="Submit"
                            fluid
                            onClick={this.handleSubmit.bind(this)}
                            primary
                        />
                    </Tab.Pane>
                ),
            },
            {
                menuItem: 'JSON Editor',
                render: () => (
                    <Tab.Pane>
                        <Header>
                            Edit your permissions in JSON format.
                        </Header>
                        <br />
                        <AceEditor
                            mode="json"
                            theme="monokai"
                            width="100%"
                            onChange={(newValue) => {
                                this.setState({
                                    statement: newValue,
                                })
                            }}
                            value={statement}
                            name="json_editor"
                            editorProps={{ $blockScrolling: true }}
                        />
                        <Divider />
                        <Header>
                            Justification
                        </Header>
                        <Form>
                            <TextArea
                                onChange={this.handleJustificationChange.bind(this)}
                                placeholder={"Your Justification"}
                                value={justification}
                            />
                        </Form>
                        <Divider />
                        <Button
                            content="Submit"
                            fluid
                            onClick={this.handleSubmit.bind(this)}
                            primary
                        />
                    </Tab.Pane>
                ),
            }
        ];
        const tabContent = (isSuccess)
            ? (
                <Message positive>
                    <Message.Header>
                        Your request was successful.
                    </Message.Header>
                    You can check your request status from <a href={`/policies/request/${requestId}`} target="_blank">here</a>.
                </Message>

            )
            : (
                <React.Fragment>
                    <Tab panes={panes} />
                    <br />
                </React.Fragment>
            );

        return (
            <React.Fragment>
                <Dimmer
                    active={isLoading}
                    inverted
                >
                    <Loader />
                </Dimmer>
                {messagesToShow}
                {tabContent}
            </React.Fragment>
        );
    }
}

export default SelfServiceStep3;