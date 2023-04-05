import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface MyStackProps extends cdk.StackProps {
  bucketName: string;
  roleName: string;
  policyName: string;
}

//this class used to create role to put the object in s3 bucket

export class GrantAccessRole extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);
    const appBoundary =iam.ManagedPolicy.fromManagedPolicyName(this, 'PermissionBoundary', `appboundary-default-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`);
    


    //const roleName = "my-iam-role";

    // Create the S3 bucket
    const bucket = new s3.Bucket(this, props.bucketName, {
      bucketName: props.bucketName,
    });

    // Create the IAM role
    const role = new iam.Role(this, props.roleName, {
      permissionsBoundary: appBoundary,
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      roleName: props.roleName,
    });

    // Create the policy that grants write-only access to the S3 bucket
    const policy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:*"],
          resources: [`${bucket.bucketArn}`],
        }),
      ],
    });

    // Attach the policy to the IAM role
    role.attachInlinePolicy(
      new iam.Policy(this, "MyPolicy", {
        policyName: props.policyName,
        document: policy,
      })
    );
  }
}
