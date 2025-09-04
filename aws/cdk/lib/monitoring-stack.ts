import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  lambdaFunctions: { [key: string]: lambda.Function };
  dynamoTables: { [key: string]: dynamodb.Table };
  distribution: cloudfront.Distribution;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'manpower-platform-alerts',
      displayName: 'Manpower Platform Alerts'
    });

    // Add email subscription (replace with actual email)
    alertTopic.addSubscription(new subscriptions.EmailSubscription('admin@yourcompany.com'));

    // Lambda function alarms
    Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
      // High error rate alarm
      const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `manpower-${name}-high-errors`,
        metric: func.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum'
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
      errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

      // High duration alarm
      const durationAlarm = new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        alarmName: `manpower-${name}-high-duration`,
        metric: func.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: 'Average'
        }),
        threshold: name === 'files' ? 30000 : 10000, // 30s for files, 10s for others
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
      durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

      // Throttle alarm
      const throttleAlarm = new cloudwatch.Alarm(this, `${name}ThrottleAlarm`, {
        alarmName: `manpower-${name}-throttles`,
        metric: func.metricThrottles({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum'
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
      throttleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    });

    // DynamoDB alarms
    Object.entries(props.dynamoTables).forEach(([name, table]) => {
      // Throttle alarm
      const readThrottleAlarm = new cloudwatch.Alarm(this, `${name}ReadThrottleAlarm`, {
        alarmName: `manpower-${name}-read-throttles`,
        metric: table.metricThrottledRequestsForOperations({
          operations: [dynamodb.Operation.GET_ITEM, dynamodb.Operation.QUERY, dynamodb.Operation.SCAN],
          period: cdk.Duration.minutes(5),
          statistic: 'Sum'
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
      readThrottleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    });

    // CloudFront alarms
    const cf4xxAlarm = new cloudwatch.Alarm(this, 'CloudFront4xxAlarm', {
      alarmName: 'manpower-cloudfront-4xx-errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '4xxErrorRate',
        dimensionsMap: {
          DistributionId: props.distribution.distributionId
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Average'
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
    cf4xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // Main dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'ManpowerDashboard', {
      dashboardName: 'manpower-platform-dashboard'
    });

    // Lambda metrics widgets
    const lambdaWidgets = Object.entries(props.lambdaFunctions).map(([name, func]) => [
      new cloudwatch.GraphWidget({
        title: `${name} Lambda Invocations`,
        width: 12,
        height: 6,
        left: [func.metricInvocations()],
        right: [func.metricErrors()]
      }),
      new cloudwatch.GraphWidget({
        title: `${name} Lambda Duration`,
        width: 12,
        height: 6,
        left: [func.metricDuration()]
      })
    ]).flat();

    // DynamoDB widgets
    const dynamoWidgets = Object.entries(props.dynamoTables).map(([name, table]) => [
      new cloudwatch.GraphWidget({
        title: `${name} DynamoDB Operations`,
        width: 12,
        height: 6,
        left: [
          table.metricConsumedReadCapacityUnits(),
          table.metricConsumedWriteCapacityUnits()
        ]
      })
    ]).flat();

    // CloudFront widget
    const cloudfrontWidget = new cloudwatch.GraphWidget({
      title: 'CloudFront Metrics',
      width: 24,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: 'Requests',
          dimensionsMap: {
            DistributionId: props.distribution.distributionId
          }
        })
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: '4xxErrorRate',
          dimensionsMap: {
            DistributionId: props.distribution.distributionId
          }
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: '5xxErrorRate',
          dimensionsMap: {
            DistributionId: props.distribution.distributionId
          }
        })
      ]
    });

    // Add widgets to dashboard
    dashboard.addWidgets(cloudfrontWidget);
    dashboard.addWidgets(...lambdaWidgets);
    dashboard.addWidgets(...dynamoWidgets);

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      exportName: 'ManpowerDashboardUrl'
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      exportName: 'ManpowerAlertTopicArn'
    });
  }
}